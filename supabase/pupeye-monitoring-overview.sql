-- Aggregate-only monitoring of existing Puppy Clicker anti-cheat signals.
-- No new collection, account-level dossiers, changes to enforcement or privileges on tables.
begin;
create or replace function public.pupeye_admin_monitoring_overview()
returns jsonb language sql stable security definer set search_path = ''
as $f$
 with active_accounts as (
  select id,player_uuid from puppy_accounts.pup_accounts where status='active'
 ), recent_web as (
  select distinct account_uuid from puppy_pupeye.web_rate_buckets
  where window_start >= now()-interval '24 hours'
 ), recent_fairplay as (
  select account_uuid from puppy_pupeye.web_fairplay_profiles
  where updated_at >= now()-interval '24 hours'
 ), recent_android as (
  select distinct a.id as account_uuid from active_accounts a
  join puppy_pupeye.pupeye_installations i on i.player_uuid=a.player_uuid
  where i.active and i.revoked_at is null and lower(i.platform)='android'
   and i.last_seen_at >= now()-interval '24 hours'
 ), coverage as (
  select account_uuid from recent_web union select account_uuid from recent_fairplay
  union select account_uuid from recent_android
 ), request_stats as (
  select action_code,sum(request_count) as requests from puppy_pupeye.web_rate_buckets
  where window_start >= now()-interval '24 hours' group by action_code
 ), incident_stats as (
  select event_code,count(*) as events from puppy_pupeye.web_security_events
  where created_at >= now()-interval '24 hours' group by event_code
 ), case_stats as (
  select severity,count(*) as cases from puppy_pupeye.web_fairplay_cases
  where created_at >= now()-interval '24 hours' group by severity
 ), device_stats as (
  select coalesce(i.integrity_state,'unknown') as state,count(*) as devices
  from puppy_pupeye.pupeye_installations i
  where i.active and i.revoked_at is null and lower(i.platform)='android'
   and i.last_seen_at >= now()-interval '24 hours'
  group by coalesce(i.integrity_state,'unknown')
 )
 select jsonb_build_object(
  'generatedAt',now(),
  'activeAccounts',(select count(*) from active_accounts),
  'observedAccounts24h',(select count(*) from active_accounts a join coverage c on c.account_uuid=a.id),
  'webAccounts24h',(select count(*) from active_accounts a join recent_web r on r.account_uuid=a.id),
  'fairplayAccounts24h',(select count(*) from active_accounts a join recent_fairplay r on r.account_uuid=a.id),
  'androidAccounts24h',(select count(*) from recent_android),
  'retainedFairplayProfiles',(select count(*) from puppy_pupeye.web_fairplay_profiles),
  'openCases',(select count(*) from puppy_pupeye.web_fairplay_cases where status='open'),
  'activeTapHolds',(select count(*) from puppy_pupeye.web_fairplay_profiles where restricted_until>now()),
  'lastFairplayObservation',(select max(updated_at) from puppy_pupeye.web_fairplay_profiles),
  'lastWebRequest',(select max(window_start) from puppy_pupeye.web_rate_buckets),
  'requestsByAction',coalesce((select jsonb_object_agg(action_code,requests) from request_stats),'{}'::jsonb),
  'incidentsByType',coalesce((select jsonb_object_agg(event_code,events) from incident_stats),'{}'::jsonb),
  'casesBySeverity',coalesce((select jsonb_object_agg(severity,cases) from case_stats),'{}'::jsonb),
  'androidIntegrityStates',coalesce((select jsonb_object_agg(state,devices) from device_stats),'{}'::jsonb)
 );
$f$;
revoke all on function public.pupeye_admin_monitoring_overview() from public,anon,authenticated;
grant execute on function public.pupeye_admin_monitoring_overview() to service_role;
commit;
