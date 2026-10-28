-- One verified Pup Account per browser Auth identity. All writes are service-role only.
-- Distinct from ARC Raiders / Ranked ID and from Android's device-bound PupEye.
create table if not exists public.pup_web_auth_links (
  account_uuid uuid primary key references public.pup_accounts(id) on delete cascade,
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  discord_user_id text unique,
  created_at timestamptz not null default now()
);
alter table public.pup_web_auth_links enable row level security;
revoke all on public.pup_web_auth_links from public, anon, authenticated;
comment on table public.pup_web_auth_links is
  'Server-verified Puppy Clicker website identity bound to a Pup Account. Browser sessions cannot register or rebind themselves. Not a PupEye installation.';
