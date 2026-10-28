-- A web browser initiates PKCE; Android receives the only registered
-- Discord redirect and forwards only the authorization code to this private relay.
create table if not exists public.pup_web_discord_relay (
 state text primary key check (state ~ '^pcw1_[A-Za-z0-9_-]{32,64}$'),
 poll_digest text not null check (poll_digest ~ '^[0-9a-f]{64}$'),
 authorization_code text,
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default (now() + interval '5 minutes')
);
create index if not exists pup_web_discord_relay_expiry_idx
 on public.pup_web_discord_relay (expires_at);
alter table public.pup_web_discord_relay enable row level security;
revoke all on public.pup_web_discord_relay from public, anon, authenticated;
comment on table public.pup_web_discord_relay is
 'Ephemeral Discord authorization-code relay: web PKCE verifier stays browser-side. Service-role only.';
