-- WARNING: Production transactional physical-table cutover.
-- All 36 Puppy Clicker tables move to six dedicated Postgres schemas.
-- Original public API endpoints are security-invoker updatable views, preserving
-- stable REST endpoints for released React Native / website clients.
-- Public PL/pgSQL functions are rewritten to hit the real physical tables,
-- preserving ON CONFLICT, row types and constraints (views cannot upsert).
-- Supabase Edge upsert paths were already migrated to restricted RPCs.
-- Entire migration is atomic: a failed statement rolls back every rename/move.
-- Do not modify ARC Ranked or HRN relations.
set local lock_timeout='4s';
set local statement_timeout='90s';
create temporary table puppy_cutover_map(
  table_name text primary key,target_schema text not null,alias_view text not null
) on commit drop;
insert into puppy_cutover_map(table_name,target_schema,alias_view) values
  ('pup_accounts','puppy_accounts','accounts'),
  ('pup_account_devices','puppy_accounts','linked_devices'),
  ('pup_beta_account_links','puppy_accounts','beta_links'),
  ('pup_credential_links','puppy_accounts','credentials'),
  ('pup_credential_pending','puppy_accounts','pending_credentials'),
  ('pup_recovery_requests','puppy_accounts','recovery_requests'),
  ('pup_web_auth_links','puppy_accounts','web_auth_links'),
  ('pup_web_discord_relay','puppy_accounts','discord_relay'),
  ('pupeye_players','puppy_pupeye','installation_players'),
  ('pupeye_installations','puppy_pupeye','installations'),
  ('pupeye_sessions','puppy_pupeye','sessions'),
  ('pupeye_save_heads','puppy_pupeye','save_heads'),
  ('pupeye_transactions','puppy_pupeye','transactions'),
  ('pupeye_events','puppy_pupeye','events'),
  ('pupeye_device_migrations','puppy_pupeye','device_migrations'),
  ('pupeye_device_reputation','puppy_pupeye','device_reputation'),
  ('pupeye_global_bans','puppy_pupeye','global_bans'),
  ('pupeye_ban_targets','puppy_pupeye','ban_targets'),
  ('pupeye_ban_events','puppy_pupeye','ban_events'),
  ('pupeye_identity_links','puppy_pupeye','identity_links'),
  ('pupeye_ban_hits','puppy_pupeye','ban_hits'),
  ('pupeye_save_attestations','puppy_pupeye','save_attestations'),
  ('pup_web_network_checks','puppy_pupeye','web_network_checks'),
  ('pup_web_ip_bans','puppy_pupeye','web_ip_bans'),
  ('pup_account_saves','puppy_game','cloud_saves'),
  ('puppy_web_saves','puppy_game','legacy_web_saves'),
  ('pup_system_notifications','puppy_game','notifications'),
  ('pup_exchange_connections','puppy_exchange','connections'),
  ('pup_exchange_offers','puppy_exchange','offers'),
  ('pup_exchange_transfer_policy','puppy_exchange','transfer_policy'),
  ('pup_exchange_privileged_gifters','puppy_exchange','privileged_gifters'),
  ('pup_gift_requests','puppy_exchange','gift_requests'),
  ('pup_admin_actions','puppy_admin','actions'),
  ('pup_web_sessions','puppy_web','sessions'),
  ('pup_web_activity_events','puppy_web','activity_events'),
  ('pup_web_signup_limits','puppy_web','signup_limits');
do $migration$
declare m record; f record; definition text; v int; moved int:=0;
begin
 -- Stop if the project has changed since the reviewed 36-table inventory.
 select count(*) into v from puppy_cutover_map m
 join pg_class c on c.relname=m.table_name and c.relkind in ('r','p')
 join pg_namespace n on n.oid=c.relnamespace and n.nspname='public';
 if v<>36 then raise exception 'PUPPY_PREFLIGHT_SOURCE_TABLES_MISMATCH expected 36 got %',v; end if;
 select count(*) into v from puppy_cutover_map m
 join pg_namespace n on n.nspname=m.target_schema
 join pg_class c on c.relnamespace=n.oid and c.relname=m.table_name;
 if v>0 then raise exception 'PUPPY_PREFLIGHT_DESTINATION_OCCUPIED %',v; end if;
 perform pg_advisory_xact_lock(hashtext('puppy-clicker-physical-cutover-v3'));
 for m in select * from puppy_cutover_map order by target_schema,table_name loop
  execute format('alter table public.%I set schema %I',m.table_name,m.target_schema);
  execute format('create view public.%I with (security_invoker = true) as select * from %I.%I',
    m.table_name,m.target_schema,m.table_name);
  execute format('grant select,insert,update,delete on public.%I to service_role',m.table_name);
  -- Only legacy web-save uses browser RLS, and must retain its original grants.
  if m.table_name='puppy_web_saves' then
   execute 'grant usage on schema puppy_game to authenticated';
   execute 'grant select,insert,update on public.puppy_web_saves to authenticated';
  end if;
  moved:=moved+1;
 end loop;
 -- Rewrite only Puppy Clicker table references in existing public SQL functions.
 -- Signatures, owners, SECURITY DEFINER settings, grants and RPC names stay intact.
 for f in
  select p.oid
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.prokind in ('f','p')
   and exists(select 1 from puppy_cutover_map m
              where position('public.'||m.table_name in p.prosrc)>0)
 loop
  definition:=pg_get_functiondef(f.oid);
  for m in select * from puppy_cutover_map order by length(table_name) desc loop
   definition:=replace(definition,'public.'||m.table_name,m.target_schema||'.'||m.table_name);
  end loop;
  execute definition;
 end loop;
 if moved<>36 then raise exception 'PUPPY_CUTOVER_INCOMPLETE %',moved;end if;
end
$migration$;
notify pgrst,'reload schema';
