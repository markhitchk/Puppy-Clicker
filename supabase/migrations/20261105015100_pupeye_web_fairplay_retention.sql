-- Privacy-safe retention for PupEye Web investigations.
create or replace function public.pupeye_web_fairplay_prune()
returns integer language plpgsql security definer set search_path = ''
as $f$
declare v_deleted integer;
begin
 delete from puppy_pupeye.web_fairplay_cases where created_at < clock_timestamp()-interval '90 days';
 get diagnostics v_deleted = row_count;
 delete from puppy_pupeye.web_fairplay_profiles
 where updated_at < clock_timestamp()-interval '90 days'
   and (restricted_until is null or restricted_until < clock_timestamp());
 return v_deleted;
end;
$f$;
revoke all on function public.pupeye_web_fairplay_prune() from public,anon,authenticated;
grant execute on function public.pupeye_web_fairplay_prune() to service_role;
-- pg_cron is already installed and used by Puppy Clicker's social cleanup.
select cron.schedule('puppy-pupeye-fairplay-daily-cleanup',
 '15 3 * * *', 'select public.pupeye_web_fairplay_prune()');
