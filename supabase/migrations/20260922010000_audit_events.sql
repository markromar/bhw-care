-- BHW Care audit events (Day 2)
--
-- Append-only record of who did what and when. Events are written only by trusted
-- server code; the app roles have no access. Never store health record contents here:
-- details holds field names, identifiers and flags only.
--
-- Triggers assign the sequence number, the timestamp and the hash chain, so a caller
-- cannot backdate or reorder events. verify_audit_chain() recomputes the chain and
-- reports the first broken event. It detects edits and removals in the middle of the
-- chain, but not removals from the very end.

create sequence public.audit_events_seq;

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  seq bigint not null unique,
  occurred_at timestamptz not null default now(),
  actor_id uuid,
  actor_role text not null
    check (actor_role in (
      'super_admin',
      'kapitan',
      'admin',
      'bhw_head',
      'bhw',
      'rhu_nurse',
      'pregnant_mother',
      'guardian',
      'system'
    )),
  action text not null check (action ~ '^[a-z0-9_.]{1,100}$'),
  entity_type text not null check (entity_type ~ '^[a-z0-9_]{1,50}$'),
  entity_id text check (entity_id is null or entity_id ~ '^[A-Za-z0-9_.:-]{1,100}$'),
  -- Plain ids, not foreign keys, so history survives account and barangay changes.
  barangay_id uuid,
  sync_operation_id uuid,
  reason_code text check (reason_code is null or reason_code ~ '^[a-z0-9_.]{1,50}$'),
  details jsonb not null default '{}'::jsonb
    check (jsonb_typeof(details) = 'object' and length(details::text) <= 4000),
  prev_hash text,
  event_hash text not null check (event_hash ~ '^[0-9a-f]{64}$'),
  check (actor_role = 'system' or actor_id is not null)
);

comment on table public.audit_events is
  'Append-only audit log. Written by trusted server code only. No PHI in details.';

create index audit_events_entity_idx on public.audit_events (entity_type, entity_id);
create index audit_events_actor_idx on public.audit_events (actor_id);
create index audit_events_barangay_idx on public.audit_events (barangay_id);

-- ---------------------------------------------------------------------------
-- Hash of one event, chained to the previous event's hash.
-- ---------------------------------------------------------------------------
create or replace function public.compute_audit_hash(
  p_prev text,
  p_seq bigint,
  p_occurred_at timestamptz,
  p_actor_id uuid,
  p_actor_role text,
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_barangay_id uuid,
  p_sync_operation_id uuid,
  p_reason_code text,
  p_details jsonb
) returns text
language sql
stable
set search_path = ''
as $$
  select encode(
    sha256(
      convert_to(
        concat_ws(
          '|',
          coalesce(p_prev, ''),
          p_seq::text,
          to_char(p_occurred_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US'),
          coalesce(p_actor_id::text, ''),
          p_actor_role,
          p_action,
          p_entity_type,
          coalesce(p_entity_id, ''),
          coalesce(p_barangay_id::text, ''),
          coalesce(p_sync_operation_id::text, ''),
          coalesce(p_reason_code, ''),
          p_details::text
        ),
        'UTF8'
      )
    ),
    'hex'
  );
$$;

-- ---------------------------------------------------------------------------
-- Insert: serialize, assign sequence and time, chain to the previous event.
-- ---------------------------------------------------------------------------
create or replace function public.audit_events_chain_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  last_hash text;
begin
  perform pg_advisory_xact_lock(hashtextextended('bhw_care.audit_events', 0));

  new.seq := nextval('public.audit_events_seq');
  new.occurred_at := clock_timestamp();

  select e.event_hash into last_hash
  from public.audit_events e
  order by e.seq desc
  limit 1;

  new.prev_hash := last_hash;
  new.event_hash := public.compute_audit_hash(
    last_hash,
    new.seq,
    new.occurred_at,
    new.actor_id,
    new.actor_role,
    new.action,
    new.entity_type,
    new.entity_id,
    new.barangay_id,
    new.sync_operation_id,
    new.reason_code,
    new.details
  );

  return new;
end;
$$;

create or replace function public.reject_audit_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'audit_events is append-only';
end;
$$;

-- Recomputes the whole chain. Returns the sequence number of the first broken event,
-- or null when the chain is intact.
create or replace function public.verify_audit_chain()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  rec record;
  expected_prev text := null;
  expected_hash text;
begin
  for rec in select * from public.audit_events order by seq loop
    if rec.prev_hash is distinct from expected_prev then
      return rec.seq;
    end if;

    expected_hash := public.compute_audit_hash(
      rec.prev_hash,
      rec.seq,
      rec.occurred_at,
      rec.actor_id,
      rec.actor_role,
      rec.action,
      rec.entity_type,
      rec.entity_id,
      rec.barangay_id,
      rec.sync_operation_id,
      rec.reason_code,
      rec.details
    );

    if rec.event_hash <> expected_hash then
      return rec.seq;
    end if;

    expected_prev := rec.event_hash;
  end loop;

  return null;
end;
$$;

revoke all on function public.compute_audit_hash(
  text, bigint, timestamptz, uuid, text, text, text, text, uuid, uuid, text, jsonb
) from public, anon, authenticated;
revoke all on function public.audit_events_chain_insert() from public, anon, authenticated;
revoke all on function public.reject_audit_change() from public, anon, authenticated;
revoke all on function public.verify_audit_chain() from public, anon, authenticated;

create trigger audit_events_chain_before_insert
  before insert on public.audit_events
  for each row execute function public.audit_events_chain_insert();

create trigger audit_events_no_update_delete
  before update or delete on public.audit_events
  for each row execute function public.reject_audit_change();

create trigger audit_events_no_truncate
  before truncate on public.audit_events
  for each statement execute function public.reject_audit_change();

-- ---------------------------------------------------------------------------
-- Access: no policies and no privileges for the app roles. Server code uses the
-- service role, which bypasses Row Level Security. A viewer for Super Admin is Day 6.
-- ---------------------------------------------------------------------------
alter table public.audit_events enable row level security;

revoke all on public.audit_events from anon, authenticated;
revoke all on sequence public.audit_events_seq from anon, authenticated;

grant execute on function public.verify_audit_chain() to service_role;