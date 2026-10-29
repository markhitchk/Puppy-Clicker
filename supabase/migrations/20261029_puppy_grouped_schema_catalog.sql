-- Non-destructive Puppy Clicker database organization (phase 1).
-- Tables remain canonical in public until all shipped web / Android / Edge Function
-- clients and server-side upserts can be migrated without disrupting older apps.
-- These views are intentionally read-only to API roles and security_invoker
-- so they NEVER bypass the original table RLS policy.
-- DO NOT add these schemas to the Supabase Data API exposed schemas until the
-- corresponding clients and grants have been audited.

create schema if not exists puppy_accounts;
revoke all on schema puppy_accounts from public, anon, authenticated;
grant usage on schema puppy_accounts to service_role;
comment on schema puppy_accounts is 'Puppy Clicker grouped catalog; original records remain in public during compatibility rollout.';
create or replace view puppy_accounts.accounts with (security_invoker = true) as select * from public.pup_accounts;
comment on view puppy_accounts.accounts is 'Read-only organizational view of public.pup_accounts; not a separate source of truth.';
create or replace view puppy_accounts.linked_devices with (security_invoker = true) as select * from public.pup_account_devices;
comment on view puppy_accounts.linked_devices is 'Read-only organizational view of public.pup_account_devices; not a separate source of truth.';
create or replace view puppy_accounts.beta_links with (security_invoker = true) as select * from public.pup_beta_account_links;
comment on view puppy_accounts.beta_links is 'Read-only organizational view of public.pup_beta_account_links; not a separate source of truth.';
create or replace view puppy_accounts.credentials with (security_invoker = true) as select * from public.pup_credential_links;
comment on view puppy_accounts.credentials is 'Read-only organizational view of public.pup_credential_links; not a separate source of truth.';
create or replace view puppy_accounts.pending_credentials with (security_invoker = true) as select * from public.pup_credential_pending;
comment on view puppy_accounts.pending_credentials is 'Read-only organizational view of public.pup_credential_pending; not a separate source of truth.';
create or replace view puppy_accounts.recovery_requests with (security_invoker = true) as select * from public.pup_recovery_requests;
comment on view puppy_accounts.recovery_requests is 'Read-only organizational view of public.pup_recovery_requests; not a separate source of truth.';
create or replace view puppy_accounts.web_auth_links with (security_invoker = true) as select * from public.pup_web_auth_links;
comment on view puppy_accounts.web_auth_links is 'Read-only organizational view of public.pup_web_auth_links; not a separate source of truth.';
create or replace view puppy_accounts.discord_relay with (security_invoker = true) as select * from public.pup_web_discord_relay;
comment on view puppy_accounts.discord_relay is 'Read-only organizational view of public.pup_web_discord_relay; not a separate source of truth.';
revoke all on all tables in schema puppy_accounts from public, anon, authenticated;
grant select on all tables in schema puppy_accounts to service_role;

create schema if not exists puppy_pupeye;
revoke all on schema puppy_pupeye from public, anon, authenticated;
grant usage on schema puppy_pupeye to service_role;
comment on schema puppy_pupeye is 'Puppy Clicker grouped catalog; original records remain in public during compatibility rollout.';
create or replace view puppy_pupeye.installation_players with (security_invoker = true) as select * from public.pupeye_players;
comment on view puppy_pupeye.installation_players is 'Read-only organizational view of public.pupeye_players; not a separate source of truth.';
create or replace view puppy_pupeye.installations with (security_invoker = true) as select * from public.pupeye_installations;
comment on view puppy_pupeye.installations is 'Read-only organizational view of public.pupeye_installations; not a separate source of truth.';
create or replace view puppy_pupeye.sessions with (security_invoker = true) as select * from public.pupeye_sessions;
comment on view puppy_pupeye.sessions is 'Read-only organizational view of public.pupeye_sessions; not a separate source of truth.';
create or replace view puppy_pupeye.save_heads with (security_invoker = true) as select * from public.pupeye_save_heads;
comment on view puppy_pupeye.save_heads is 'Read-only organizational view of public.pupeye_save_heads; not a separate source of truth.';
create or replace view puppy_pupeye.transactions with (security_invoker = true) as select * from public.pupeye_transactions;
comment on view puppy_pupeye.transactions is 'Read-only organizational view of public.pupeye_transactions; not a separate source of truth.';
create or replace view puppy_pupeye.events with (security_invoker = true) as select * from public.pupeye_events;
comment on view puppy_pupeye.events is 'Read-only organizational view of public.pupeye_events; not a separate source of truth.';
create or replace view puppy_pupeye.device_migrations with (security_invoker = true) as select * from public.pupeye_device_migrations;
comment on view puppy_pupeye.device_migrations is 'Read-only organizational view of public.pupeye_device_migrations; not a separate source of truth.';
create or replace view puppy_pupeye.device_reputation with (security_invoker = true) as select * from public.pupeye_device_reputation;
comment on view puppy_pupeye.device_reputation is 'Read-only organizational view of public.pupeye_device_reputation; not a separate source of truth.';
create or replace view puppy_pupeye.global_bans with (security_invoker = true) as select * from public.pupeye_global_bans;
comment on view puppy_pupeye.global_bans is 'Read-only organizational view of public.pupeye_global_bans; not a separate source of truth.';
create or replace view puppy_pupeye.ban_targets with (security_invoker = true) as select * from public.pupeye_ban_targets;
comment on view puppy_pupeye.ban_targets is 'Read-only organizational view of public.pupeye_ban_targets; not a separate source of truth.';
create or replace view puppy_pupeye.ban_events with (security_invoker = true) as select * from public.pupeye_ban_events;
comment on view puppy_pupeye.ban_events is 'Read-only organizational view of public.pupeye_ban_events; not a separate source of truth.';
create or replace view puppy_pupeye.identity_links with (security_invoker = true) as select * from public.pupeye_identity_links;
comment on view puppy_pupeye.identity_links is 'Read-only organizational view of public.pupeye_identity_links; not a separate source of truth.';
create or replace view puppy_pupeye.ban_hits with (security_invoker = true) as select * from public.pupeye_ban_hits;
comment on view puppy_pupeye.ban_hits is 'Read-only organizational view of public.pupeye_ban_hits; not a separate source of truth.';
create or replace view puppy_pupeye.save_attestations with (security_invoker = true) as select * from public.pupeye_save_attestations;
comment on view puppy_pupeye.save_attestations is 'Read-only organizational view of public.pupeye_save_attestations; not a separate source of truth.';
create or replace view puppy_pupeye.web_network_checks with (security_invoker = true) as select * from public.pup_web_network_checks;
comment on view puppy_pupeye.web_network_checks is 'Read-only organizational view of public.pup_web_network_checks; not a separate source of truth.';
create or replace view puppy_pupeye.web_ip_bans with (security_invoker = true) as select * from public.pup_web_ip_bans;
comment on view puppy_pupeye.web_ip_bans is 'Read-only organizational view of public.pup_web_ip_bans; not a separate source of truth.';
revoke all on all tables in schema puppy_pupeye from public, anon, authenticated;
grant select on all tables in schema puppy_pupeye to service_role;

create schema if not exists puppy_game;
revoke all on schema puppy_game from public, anon, authenticated;
grant usage on schema puppy_game to service_role;
comment on schema puppy_game is 'Puppy Clicker grouped catalog; original records remain in public during compatibility rollout.';
create or replace view puppy_game.cloud_saves with (security_invoker = true) as select * from public.pup_account_saves;
comment on view puppy_game.cloud_saves is 'Read-only organizational view of public.pup_account_saves; not a separate source of truth.';
create or replace view puppy_game.legacy_web_saves with (security_invoker = true) as select * from public.puppy_web_saves;
comment on view puppy_game.legacy_web_saves is 'Read-only organizational view of public.puppy_web_saves; not a separate source of truth.';
create or replace view puppy_game.notifications with (security_invoker = true) as select * from public.pup_system_notifications;
comment on view puppy_game.notifications is 'Read-only organizational view of public.pup_system_notifications; not a separate source of truth.';
revoke all on all tables in schema puppy_game from public, anon, authenticated;
grant select on all tables in schema puppy_game to service_role;

create schema if not exists puppy_exchange;
revoke all on schema puppy_exchange from public, anon, authenticated;
grant usage on schema puppy_exchange to service_role;
comment on schema puppy_exchange is 'Puppy Clicker grouped catalog; original records remain in public during compatibility rollout.';
create or replace view puppy_exchange.connections with (security_invoker = true) as select * from public.pup_exchange_connections;
comment on view puppy_exchange.connections is 'Read-only organizational view of public.pup_exchange_connections; not a separate source of truth.';
create or replace view puppy_exchange.offers with (security_invoker = true) as select * from public.pup_exchange_offers;
comment on view puppy_exchange.offers is 'Read-only organizational view of public.pup_exchange_offers; not a separate source of truth.';
create or replace view puppy_exchange.transfer_policy with (security_invoker = true) as select * from public.pup_exchange_transfer_policy;
comment on view puppy_exchange.transfer_policy is 'Read-only organizational view of public.pup_exchange_transfer_policy; not a separate source of truth.';
create or replace view puppy_exchange.privileged_gifters with (security_invoker = true) as select * from public.pup_exchange_privileged_gifters;
comment on view puppy_exchange.privileged_gifters is 'Read-only organizational view of public.pup_exchange_privileged_gifters; not a separate source of truth.';
create or replace view puppy_exchange.gift_requests with (security_invoker = true) as select * from public.pup_gift_requests;
comment on view puppy_exchange.gift_requests is 'Read-only organizational view of public.pup_gift_requests; not a separate source of truth.';
revoke all on all tables in schema puppy_exchange from public, anon, authenticated;
grant select on all tables in schema puppy_exchange to service_role;

create schema if not exists puppy_admin;
revoke all on schema puppy_admin from public, anon, authenticated;
grant usage on schema puppy_admin to service_role;
comment on schema puppy_admin is 'Puppy Clicker grouped catalog; original records remain in public during compatibility rollout.';
create or replace view puppy_admin.actions with (security_invoker = true) as select * from public.pup_admin_actions;
comment on view puppy_admin.actions is 'Read-only organizational view of public.pup_admin_actions; not a separate source of truth.';
revoke all on all tables in schema puppy_admin from public, anon, authenticated;
grant select on all tables in schema puppy_admin to service_role;

create schema if not exists puppy_web;
revoke all on schema puppy_web from public, anon, authenticated;
grant usage on schema puppy_web to service_role;
comment on schema puppy_web is 'Puppy Clicker grouped catalog; original records remain in public during compatibility rollout.';
create or replace view puppy_web.sessions with (security_invoker = true) as select * from public.pup_web_sessions;
comment on view puppy_web.sessions is 'Read-only organizational view of public.pup_web_sessions; not a separate source of truth.';
create or replace view puppy_web.activity_events with (security_invoker = true) as select * from public.pup_web_activity_events;
comment on view puppy_web.activity_events is 'Read-only organizational view of public.pup_web_activity_events; not a separate source of truth.';
create or replace view puppy_web.signup_limits with (security_invoker = true) as select * from public.pup_web_signup_limits;
comment on view puppy_web.signup_limits is 'Read-only organizational view of public.pup_web_signup_limits; not a separate source of truth.';
revoke all on all tables in schema puppy_web from public, anon, authenticated;
grant select on all tables in schema puppy_web to service_role;

