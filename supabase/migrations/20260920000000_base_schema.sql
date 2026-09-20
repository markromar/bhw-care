-- BHW Care base schema (Day 1)
--
-- Foundation only: barangays, puroks, user profiles, user roles, system settings.
-- No patient health information is stored in any table created here.
-- Row Level Security is enabled on every table, and app roles receive only the
-- explicit privileges granted at the bottom of this file.
--
-- Deliberately NOT here (Day 2 and later): invitations, the full permission
-- matrix, purok/assignment policies, relationship checks, registration states,
-- clinical records.

-- ---------------------------------------------------------------------------
-- Helper: keep updated_at current
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- barangays
-- ---------------------------------------------------------------------------
create table public.barangays (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city_municipality text not null,
  province text,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (city_municipality, name)
);

comment on table public.barangays is
  'Barangay directory. Non-PHI. Every barangay-scoped record references this table.';

create trigger barangays_set_updated_at
  before update on public.barangays
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- puroks
-- ---------------------------------------------------------------------------
create table public.puroks (
  id uuid primary key default gen_random_uuid(),
  barangay_id uuid not null references public.barangays (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (barangay_id, name)
);

create index puroks_barangay_id_idx on public.puroks (barangay_id);

comment on table public.puroks is
  'Purok/sitio areas inside a barangay. Non-PHI. Used later for BHW assignment scope.';

-- ---------------------------------------------------------------------------
-- user_profiles
-- ---------------------------------------------------------------------------
create table public.user_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  preferred_language text
    check (preferred_language is null or preferred_language in ('en', 'tl')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.user_profiles is
  'Personal profile settings for each account. Clinical data never lives here.';

create trigger user_profiles_set_updated_at
  before update on public.user_profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- user_roles
-- ---------------------------------------------------------------------------
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null
    check (role in (
      'super_admin',
      'kapitan',
      'admin',
      'bhw_head',
      'bhw',
      'rhu_nurse',
      'pregnant_mother',
      'guardian'
    )),
  barangay_id uuid references public.barangays (id) on delete restrict,
  created_at timestamptz not null default now(),
  -- Every role except super_admin must be tied to a barangay.
  check (role = 'super_admin' or barangay_id is not null),
  unique (user_id, role)
);

create index user_roles_user_id_idx on public.user_roles (user_id);
create index user_roles_barangay_id_idx on public.user_roles (barangay_id);

comment on table public.user_roles is
  'Role assignments. Written only by server-side functions, never directly by the app.';

-- ---------------------------------------------------------------------------
-- system_settings
-- ---------------------------------------------------------------------------
create table public.system_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

comment on table public.system_settings is
  'Non-sensitive system configuration such as the default language.';

create trigger system_settings_set_updated_at
  before update on public.system_settings
  for each row execute function public.set_updated_at();

insert into public.system_settings (key, value)
values ('system_default_language', '"en"'::jsonb)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.barangays enable row level security;
alter table public.puroks enable row level security;
alter table public.user_profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.system_settings enable row level security;

-- A signed-in user can read only the barangay they hold a role in.
create policy barangays_read_own
  on public.barangays
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.user_roles ur
      where ur.user_id = (select auth.uid())
        and ur.barangay_id = barangays.id
    )
  );

-- Puroks are visible only inside the user's own barangay.
create policy puroks_read_own_barangay
  on public.puroks
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.user_roles ur
      where ur.user_id = (select auth.uid())
        and ur.barangay_id = puroks.barangay_id
    )
  );

-- Users can read and edit only their own profile row.
create policy user_profiles_read_own
  on public.user_profiles
  for select
  to authenticated
  using (id = (select auth.uid()));

create policy user_profiles_update_own
  on public.user_profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Users can read only their own role rows.
create policy user_roles_read_own
  on public.user_roles
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- System settings hold no sensitive data; any signed-in user can read them.
create policy system_settings_read_all
  on public.system_settings
  for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Privileges: start from nothing, then grant only what is needed.
-- ---------------------------------------------------------------------------
revoke all on public.barangays from anon, authenticated;
revoke all on public.puroks from anon, authenticated;
revoke all on public.user_profiles from anon, authenticated;
revoke all on public.user_roles from anon, authenticated;
revoke all on public.system_settings from anon, authenticated;

grant select on public.barangays to authenticated;
grant select on public.puroks to authenticated;
grant select on public.user_profiles to authenticated;
grant select on public.user_roles to authenticated;
grant select on public.system_settings to authenticated;

-- Users may change only these two columns on their own profile.
grant update (display_name, preferred_language) on public.user_profiles to authenticated;