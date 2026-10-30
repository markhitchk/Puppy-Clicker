-- Emergency rollback: restores 36 original physical tables to public.
-- Does not delete data. Requires same role and a quiet maintenance window.
set local lock_timeout='4s';
create temporary table puppy_rollback_map(table_name text,target_schema text) on commit drop;
insert into puppy_rollback_map values
 ('pup_accounts','puppy_accounts'),
 ('pup_account_devices','puppy_accounts'),
 ('pup_beta_account_links','puppy_accounts'),
 ('pup_credential_links','puppy_accounts'),
 ('pup_credential_pending','puppy_accounts'),
 ('pup_recovery_requests','puppy_accounts'),
 ('pup_web_auth_links','puppy_accounts'),
 ('pup_web_discord_relay','puppy_accounts'),
 ('pupeye_players','puppy_pupeye'),
 ('pupeye_installations','puppy_pupeye'),
 ('pupeye_sessions','puppy_pupeye'),
 ('pupeye_save_heads','puppy_pupeye'),
 ('pupeye_transactions','puppy_pupeye'),
 ('pupeye_events','puppy_pupeye'),
 ('pupeye_device_migrations','puppy_pupeye'),
 ('pupeye_device_reputation','puppy_pupeye'),
 ('pupeye_global_bans','puppy_pupeye'),
 ('pupeye_ban_targets','puppy_pupeye'),
 ('pupeye_ban_events','puppy_pupeye'),
 ('pupeye_identity_links','puppy_pupeye'),
 ('pupeye_ban_hits','puppy_pupeye'),
 ('pupeye_save_attestations','puppy_pupeye'),
 ('pup_web_network_checks','puppy_pupeye'),
 ('pup_web_ip_bans','puppy_pupeye'),
 ('pup_account_saves','puppy_game'),
 ('puppy_web_saves','puppy_game'),
 ('pup_system_notifications','puppy_game'),
 ('pup_exchange_connections','puppy_exchange'),
 ('pup_exchange_offers','puppy_exchange'),
 ('pup_exchange_transfer_policy','puppy_exchange'),
 ('pup_exchange_privileged_gifters','puppy_exchange'),
 ('pup_gift_requests','puppy_exchange'),
 ('pup_admin_actions','puppy_admin'),
 ('pup_web_sessions','puppy_web'),
 ('pup_web_activity_events','puppy_web'),
 ('pup_web_signup_limits','puppy_web');
do $rollback$
declare m record; f record; definition text;
begin
 perform pg_advisory_xact_lock(hashtext('puppy-clicker-physical-cutover-v3'));
 for m in select * from puppy_rollback_map order by target_schema,table_name loop
  if to_regclass(format('public.%I',m.table_name)) is null then
   raise exception 'PUBLIC_COMPATIBILITY_VIEW_MISSING %',m.table_name;
  end if;
  execute format('drop view public.%I',m.table_name);
  execute format('alter table %I.%I set schema public',m.target_schema,m.table_name);
 end loop;
 for f in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.prokind in ('f','p')
    and exists(select 1 from puppy_rollback_map m
         where position(m.target_schema||'.'||m.table_name in p.prosrc)>0)
 loop
  definition:=pg_get_functiondef(f.oid);
  for m in select * from puppy_rollback_map order by length(table_name) desc loop
   definition:=replace(definition,m.target_schema||'.'||m.table_name,'public.'||m.table_name);
  end loop;
  execute definition;
 end loop;
end
$rollback$;
notify pgrst,'reload schema';
