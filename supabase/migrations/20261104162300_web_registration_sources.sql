-- Server-only discovery attribution; separate from credentials and game saves.
create table if not exists puppy_web.pup_registration_sources (
 account_uuid uuid primary key references puppy_accounts.pup_accounts(id) on delete cascade,
 source text not null check (source in ('friend','discord','youtube','tiktok','instagram','reddit','google','play_store','other')),
 details text check (details is null or char_length(details) <= 120),
 created_at timestamptz not null default now()
);
alter table puppy_web.pup_registration_sources enable row level security;
revoke all on puppy_web.pup_registration_sources from anon, authenticated;
grant usage on schema puppy_web to service_role;
grant select, insert on puppy_web.pup_registration_sources to service_role;
create or replace view public.pup_registration_sources with (security_invoker = true) as
 select account_uuid,source,details,created_at from puppy_web.pup_registration_sources;
revoke all on public.pup_registration_sources from public, anon, authenticated;
grant select, insert on public.pup_registration_sources to service_role;
notify pgrst,'reload schema';
