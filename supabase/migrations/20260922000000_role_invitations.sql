-- BHW Care role invitations (Day 2)
--
-- Invitation records are the authorization source for staff accounts. The email link
-- is only a delivery mechanism. This table holds the email address, role and barangay.
-- It never holds health information, and never holds the invite link or token.
--
-- The hierarchy and lifecycle rules are enforced here, in the database, so a bug in
-- later server code cannot bypass them:
--   - a kapitan invitation must come from a super admin
--   - every other invitable role must come from the kapitan of that same barangay
--   - locked fields cannot change, closed invitations cannot change, nothing is deleted

create table public.role_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null
    check (
      email = lower(email)
      and length(email) <= 254
      and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    ),
  role text not null
    check (role in (
      'kapitan',
      'admin',
      'bhw_head',
      'bhw',
      'rhu_nurse'
    )),
  barangay_id uuid not null references public.barangays (id) on delete restrict,
  -- Kept as a plain id, not a foreign key, so attribution survives account deletion.
  invited_by uuid not null,
  status text not null default 'pending'
    check (status in (
      'pending',
      'accepted',
      'revoked',
      'expired'
    )),
  -- Opaque reference set by the sending function. Never the token or the link itself.
  token_reference text
    check (token_reference is null or length(token_reference) <= 200),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at),
  check (expires_at <= created_at + interval '30 days'),
  check ((status = 'accepted') = (accepted_at is not null)),
  check ((accepted_at is null) = (accepted_by is null)),
  check ((status = 'revoked') = (revoked_at is not null))
);

comment on table public.role_invitations is
  'Staff role invitations. Email, role and barangay only; no PHI, no tokens or links.';

-- One pending invitation per email. Re-inviting means revoking the old one first.
create unique index role_invitations_one_pending_per_email
  on public.role_invitations (email)
  where status = 'pending';

create index role_invitations_barangay_idx on public.role_invitations (barangay_id);
create index role_invitations_invited_by_idx on public.role_invitations (invited_by);

-- ---------------------------------------------------------------------------
-- Insert rules: who may invite whom, and the barangay state.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_invitation_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  barangay_status text;
begin
  new.email := lower(btrim(new.email));
  new.created_at := now();

  if new.status <> 'pending'
     or new.accepted_at is not null
     or new.accepted_by is not null
     or new.revoked_at is not null then
    raise exception 'a new invitation must be pending';
  end if;

  select b.status into barangay_status
  from public.barangays b
  where b.id = new.barangay_id;

  if barangay_status is null then
    raise exception 'unknown barangay';
  end if;

  if new.role = 'kapitan' then
    if not exists (
      select 1 from public.user_roles ur
      where ur.user_id = new.invited_by and ur.role = 'super_admin'
    ) then
      raise exception 'only a super admin can invite a kapitan';
    end if;
    if barangay_status = 'suspended' then
      raise exception 'the barangay is suspended';
    end if;
  else
    if not exists (
      select 1 from public.user_roles ur
      where ur.user_id = new.invited_by
        and ur.role = 'kapitan'
        and ur.barangay_id = new.barangay_id
    ) then
      raise exception 'only the kapitan of this barangay can send this invitation';
    end if;
    if barangay_status <> 'active' then
      raise exception 'the barangay is not active';
    end if;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Update rules: locked fields, single use, no reopening, expiry.
-- ---------------------------------------------------------------------------
create or replace function public.guard_invitation_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
     or new.email is distinct from old.email
     or new.role is distinct from old.role
     or new.barangay_id is distinct from old.barangay_id
     or new.invited_by is distinct from old.invited_by
     or new.expires_at is distinct from old.expires_at
     or new.created_at is distinct from old.created_at then
    raise exception 'invitation identity fields cannot be changed';
  end if;

  if old.token_reference is not null
     and new.token_reference is distinct from old.token_reference then
    raise exception 'token_reference can only be set once';
  end if;

  if old.status <> 'pending' then
    if new is distinct from old then
      raise exception 'a closed invitation cannot be changed';
    end if;
    return new;
  end if;

  -- clock_timestamp() moves during a transaction, unlike now().
  if new.status = 'accepted' and clock_timestamp() > old.expires_at then
    raise exception 'the invitation has expired';
  end if;

  return new;
end;
$$;

create or replace function public.reject_invitation_removal()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'role_invitations rows are never deleted';
end;
$$;

revoke all on function public.enforce_invitation_insert() from public, anon, authenticated;
revoke all on function public.guard_invitation_update() from public, anon, authenticated;
revoke all on function public.reject_invitation_removal() from public, anon, authenticated;

create trigger role_invitations_enforce_insert
  before insert on public.role_invitations
  for each row execute function public.enforce_invitation_insert();

create trigger role_invitations_guard_update
  before update on public.role_invitations
  for each row execute function public.guard_invitation_update();

create trigger role_invitations_no_delete
  before delete on public.role_invitations
  for each row execute function public.reject_invitation_removal();

create trigger role_invitations_no_truncate
  before truncate on public.role_invitations
  for each statement execute function public.reject_invitation_removal();

-- ---------------------------------------------------------------------------
-- Row Level Security: read only. Creating and changing invitations is server-side.
-- ---------------------------------------------------------------------------
alter table public.role_invitations enable row level security;

-- You can read the invitations you sent.
create policy role_invitations_read_sent
  on public.role_invitations
  for select
  to authenticated
  using (invited_by = (select auth.uid()));

-- A kapitan can read the invitations of their own barangay.
create policy role_invitations_read_own_barangay_kapitan
  on public.role_invitations
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.user_roles ur
      where ur.user_id = (select auth.uid())
        and ur.role = 'kapitan'
        and ur.barangay_id = role_invitations.barangay_id
    )
  );

revoke all on public.role_invitations from anon, authenticated;

grant select on public.role_invitations to authenticated;