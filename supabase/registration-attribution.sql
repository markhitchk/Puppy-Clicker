-- Staged deployment SQL: apply before deploying pup-web-auth and the website.
-- Existing discovery source/details and registration records are preserved.
begin;
alter table puppy_web.pup_registration_sources alter column source drop not null;
alter table puppy_web.pup_registration_sources add column if not exists registration_method text check (registration_method in ('password','discord'));
alter table puppy_web.pup_registration_sources add column if not exists inviter_account_uuid uuid references puppy_accounts.pup_accounts(id) on delete set null;
alter table puppy_web.pup_registration_sources enable row level security;
revoke all on puppy_web.pup_registration_sources from public, anon, authenticated;
grant select, insert on puppy_web.pup_registration_sources to service_role;
create or replace view public.pup_registration_sources with (security_invoker = true) as
 select account_uuid,source,details,created_at,registration_method,inviter_account_uuid from puppy_web.pup_registration_sources;
revoke all on public.pup_registration_sources from public, anon, authenticated;
grant select, insert on public.pup_registration_sources to service_role;
notify pgrst,'reload schema';
commit;
