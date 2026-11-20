-- Staged only. Apply in staging and validate before production launch.
begin;
create table if not exists public.pup_event_settings (
 event_id text primary key check (event_id ~ '^[a-z][a-z0-9_]{1,63}$'),
 enabled boolean not null default false
);
insert into public.pup_event_settings(event_id,enabled) values ('all_events',true),('christmas_2026',true),('winter_effects',true) on conflict (event_id) do nothing;
alter table public.pup_event_settings enable row level security;
revoke all on public.pup_event_settings from public,anon,authenticated;
grant select on public.pup_event_settings to anon,authenticated;
grant select,update on public.pup_event_settings to service_role;
drop policy if exists event_settings_public_read on public.pup_event_settings;
create policy event_settings_public_read on public.pup_event_settings for select to anon,authenticated using (true);
create or replace function public.pup_event_settings_public() returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_object_agg(event_id,enabled),'{}'::jsonb) from public.pup_event_settings;
$$;
revoke all on function public.pup_event_settings_public() from public,anon,authenticated;
grant execute on function public.pup_event_settings_public() to anon,authenticated,service_role;
notify pgrst,'reload schema';
commit;
