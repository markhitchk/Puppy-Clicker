-- Puppy Clicker-owned data only; no changes to shared ARC, DMZ or other schemas.
alter table public.pup_accounts add column if not exists profile_avatar_url text;
do $$ begin
 if not exists(select 1 from pg_constraint where conname='pup_profile_avatar_url_valid' and conrelid='public.pup_accounts'::regclass) then
  alter table public.pup_accounts add constraint pup_profile_avatar_url_valid check(
   profile_avatar_url is null or (char_length(profile_avatar_url)<=2048
    and profile_avatar_url ~ '^https://[^[:space:]]+$')
  );
 end if;
end $$;
create table if not exists public.pup_web_ip_bans(
 id uuid primary key default gen_random_uuid(),
 ip_address inet not null unique,
 reason text not null check(char_length(trim(reason)) between 3 and 300),
 expires_at timestamptz,
 revoked_at timestamptz,
 actor_player_uuid uuid not null references public.pupeye_players(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint pup_web_ip_ban_dates check(expires_at is null or expires_at>created_at)
);
create index if not exists pup_web_ip_bans_active_idx on public.pup_web_ip_bans(ip_address) where revoked_at is null;
alter table public.pup_web_ip_bans enable row level security;
revoke all on public.pup_web_ip_bans from public,anon,authenticated;
