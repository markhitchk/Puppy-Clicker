-- Review and deploy in Supabase before enabling VITE_NETWORK_CHECK_ENABLED.
-- Private network telemetry table; never grant Data API read or write to browser roles.
-- This is separate from account/PupEye bans and does not automatically impose sanctions.
create table if not exists public.pup_web_network_checks (
  id bigint generated always as identity primary key,
  checked_at timestamptz not null default now(),
  auth_user_id uuid null,
  account_uuid uuid null references public.pup_accounts(id) on delete set null,
  ip_address inet not null,
  user_agent text not null check (char_length(user_agent) <= 2048),
  detection_status text not null check (detection_status in ('detected','not_detected','unknown')),
  vpn boolean null, proxy boolean null, tor boolean null,
  hosting boolean null, anonymous boolean null,
  risk_score integer null check (risk_score between 0 and 100),
  confidence integer null check (confidence between 0 and 100),
  provider text not null default 'proxycheck-v3'
);
create index if not exists pup_web_network_checks_time_idx on public.pup_web_network_checks (checked_at desc);
create index if not exists pup_web_network_checks_account_idx on public.pup_web_network_checks (account_uuid, checked_at desc);
create index if not exists pup_web_network_checks_ip_idx on public.pup_web_network_checks (ip_address, checked_at desc);
alter table public.pup_web_network_checks enable row level security;
revoke all on table public.pup_web_network_checks from anon, authenticated;
revoke all on sequence public.pup_web_network_checks_id_seq from anon, authenticated;
-- No client-facing policies by design. Grant access only through narrowly authorized admin APIs.
-- Set a retention policy before launch, e.g. a scheduled task executing:
-- DELETE FROM public.pup_web_network_checks WHERE checked_at < now() - interval '30 days';
