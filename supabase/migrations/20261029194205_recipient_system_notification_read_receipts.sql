-- Persist recipient-side read state without altering gift or cloud-save records.
-- Rows remain service-role-only: web recipients access their own inbox via
-- the authenticated pup-web-auth Edge Function.
alter table public.pup_system_notifications
 add column if not exists read_at timestamptz,
 add column if not exists dismissed_at timestamptz;
create index if not exists pup_system_notifications_owner_recent_idx
 on public.pup_system_notifications(player_uuid, created_at desc);
comment on column public.pup_system_notifications.read_at is
 'Recipient acknowledged this notification via an authenticated account endpoint.';
comment on column public.pup_system_notifications.dismissed_at is
 'Recipient hid a previously read notification; original audit record is preserved.';
