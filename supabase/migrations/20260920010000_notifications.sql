-- BHW Care notification tables (Day 1)
--
-- Storage only. Nothing here sends a notification.
-- Notifications are created by trusted server-side code (service role), never by
-- the mobile app. Signed-in users can read and mark-read only their own.
-- No patient health information is stored in these tables: notifications hold
-- template keys and recipient-safe metadata only.

-- ---------------------------------------------------------------------------
-- notifications: the persisted in-app inbox
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users (id) on delete cascade,
  barangay_id uuid references public.barangays (id) on delete restrict,
  type text not null check (type ~ '^[a-z0-9_.]+$'),
  priority text not null default 'normal'
    check (priority in ('normal', 'urgent')),
  source_type text
    check (source_type is null or source_type ~ '^[a-z0-9_.]+$'),
  source_id uuid,
  title_key text,
  body_key text,
  template_version text,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  -- Deterministic event key, e.g. 'prenatal:{appointment_id}:near_due'.
  -- The unique constraint stops a retried job from creating a duplicate.
  idempotency_key text not null unique
    check (length(idempotency_key) between 1 and 200),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_recipient_created_idx
  on public.notifications (recipient_id, created_at desc);

create index notifications_recipient_unread_idx
  on public.notifications (recipient_id)
  where read_at is null;

comment on table public.notifications is
  'In-app notification inbox. Template keys and recipient-safe metadata only; no PHI.';
comment on column public.notifications.metadata is
  'Must be safe for the recipient to see. Never place diagnoses, lab values or full addresses here.';

-- ---------------------------------------------------------------------------
-- notification_deliveries: one row per notification per channel (server only)
-- ---------------------------------------------------------------------------
create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications (id) on delete cascade,
  channel text not null check (channel in ('in_app', 'push', 'sms')),
  status text not null default 'queued'
    check (status in (
      'scheduled',
      'queued',
      'sending',
      'accepted',
      'delivered',
      'failed',
      'unknown',
      'cancelled',
      'superseded'
    )),
  provider text,
  provider_message_id text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error_code text,
  status_changed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (notification_id, channel)
);

create trigger notification_deliveries_set_updated_at
  before update on public.notification_deliveries
  for each row execute function public.set_updated_at();

comment on table public.notification_deliveries is
  'Delivery state per channel. Server-side only. delivered is set only on provider evidence.';

-- ---------------------------------------------------------------------------
-- notification_preferences: user choices for optional channels
-- ---------------------------------------------------------------------------
create table public.notification_preferences (
  user_id uuid not null references auth.users (id) on delete cascade,
  channel text not null check (channel in ('push', 'sms')),
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (user_id, channel)
);

create trigger notification_preferences_set_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_updated_at();

comment on table public.notification_preferences is
  'Optional channels only. In-app cannot be switched off, so urgent notices stay visible.';

-- ---------------------------------------------------------------------------
-- push_tokens: device push tokens linked to the signed-in account
-- ---------------------------------------------------------------------------
create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  expo_push_token text not null unique
    check (length(expo_push_token) between 1 and 300),
  platform text not null check (platform in ('ios', 'android')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index push_tokens_user_id_idx on public.push_tokens (user_id);

comment on table public.push_tokens is
  'Device push tokens. Visible only to the owning user. revoked_at supports sign-out and device revocation.';

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.notifications enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.push_tokens enable row level security;

-- notifications: read and mark-read your own. Inserts are server-side only.
create policy notifications_read_own
  on public.notifications
  for select
  to authenticated
  using (recipient_id = (select auth.uid()));

create policy notifications_update_own
  on public.notifications
  for update
  to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

-- notification_deliveries: no policies and no grants. Server-side only for now.

-- notification_preferences: manage your own optional channels.
create policy notification_preferences_read_own
  on public.notification_preferences
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy notification_preferences_insert_own
  on public.notification_preferences
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy notification_preferences_update_own
  on public.notification_preferences
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- push_tokens: manage your own device tokens.
create policy push_tokens_read_own
  on public.push_tokens
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy push_tokens_insert_own
  on public.push_tokens
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy push_tokens_update_own
  on public.push_tokens
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy push_tokens_delete_own
  on public.push_tokens
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Privileges: start from nothing, then grant only what is needed.
-- ---------------------------------------------------------------------------
revoke all on public.notifications from anon, authenticated;
revoke all on public.notification_deliveries from anon, authenticated;
revoke all on public.notification_preferences from anon, authenticated;
revoke all on public.push_tokens from anon, authenticated;

grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

grant select on public.notification_preferences to authenticated;
grant insert (user_id, channel, enabled) on public.notification_preferences to authenticated;
grant update (enabled) on public.notification_preferences to authenticated;

grant select on public.push_tokens to authenticated;
grant insert (user_id, expo_push_token, platform) on public.push_tokens to authenticated;
grant update (last_seen_at, revoked_at) on public.push_tokens to authenticated;
grant delete on public.push_tokens to authenticated;