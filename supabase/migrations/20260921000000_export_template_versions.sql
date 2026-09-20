-- BHW Care export template versions (Day 1)
--
-- Versioned PDF export template configuration. Configuration only: no patient
-- data is stored here. Published versions are immutable, so every earlier export
-- stays attributable to the template version that produced it.
--
-- Publishing (a server-side function that requires a verified Super Admin with
-- MFA) is added on Day 2. The app itself can only read.

create table public.export_template_versions (
  id uuid primary key default gen_random_uuid(),
  record_type text not null
    check (record_type in ('prenatal', 'newborn', 'vaccination')),
  version integer not null check (version >= 1),
  config jsonb not null check (jsonb_typeof(config) = 'object'),
  change_summary text not null
    check (length(btrim(change_summary)) between 1 and 300),
  -- Author id kept for attribution. Intentionally not a foreign key: a cascade
  -- on user deletion would update this table and be blocked by the immutability
  -- trigger, and history must survive account deletion.
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (record_type, version)
);

comment on table public.export_template_versions is
  'Immutable versions of PDF export template configuration. No PHI.';

-- ---------------------------------------------------------------------------
-- Immutability: reject any change to a published version, for every role.
-- ---------------------------------------------------------------------------
create or replace function public.reject_export_template_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'export_template_versions is append-only: publish a new version instead';
end;
$$;

revoke all on function public.reject_export_template_change() from public, anon, authenticated;

create trigger export_template_versions_no_update_delete
  before update or delete on public.export_template_versions
  for each row execute function public.reject_export_template_change();

create trigger export_template_versions_no_truncate
  before truncate on public.export_template_versions
  for each statement execute function public.reject_export_template_change();

-- ---------------------------------------------------------------------------
-- Row Level Security: signed-in users can read; nobody can write from the app.
-- ---------------------------------------------------------------------------
alter table public.export_template_versions enable row level security;

create policy export_template_versions_read
  on public.export_template_versions
  for select
  to authenticated
  using (true);

revoke all on public.export_template_versions from anon, authenticated;

grant select on public.export_template_versions to authenticated;