// Puppy Clicker schema catalog v2. Canonical data still lives in public.
// New grouped schemas are security-invoker read-only views until final cutover.
// Never route INSERT, UPDATE, UPSERT, DELETE or RPC to a grouped view.
export const PUPPY_SCHEMA_LAYOUT_VERSION = 2;
export const PUPPY_SCHEMA_TABLES = Object.freeze({
  "pup_accounts": {
    "schema": "puppy_accounts",
    "view": "accounts"
  },
  "pup_account_devices": {
    "schema": "puppy_accounts",
    "view": "linked_devices"
  },
  "pup_beta_account_links": {
    "schema": "puppy_accounts",
    "view": "beta_links"
  },
  "pup_credential_links": {
    "schema": "puppy_accounts",
    "view": "credentials"
  },
  "pup_credential_pending": {
    "schema": "puppy_accounts",
    "view": "pending_credentials"
  },
  "pup_recovery_requests": {
    "schema": "puppy_accounts",
    "view": "recovery_requests"
  },
  "pup_web_auth_links": {
    "schema": "puppy_accounts",
    "view": "web_auth_links"
  },
  "pup_web_discord_relay": {
    "schema": "puppy_accounts",
    "view": "discord_relay"
  },
  "pupeye_players": {
    "schema": "puppy_pupeye",
    "view": "installation_players"
  },
  "pupeye_installations": {
    "schema": "puppy_pupeye",
    "view": "installations"
  },
  "pupeye_sessions": {
    "schema": "puppy_pupeye",
    "view": "sessions"
  },
  "pupeye_save_heads": {
    "schema": "puppy_pupeye",
    "view": "save_heads"
  },
  "pupeye_transactions": {
    "schema": "puppy_pupeye",
    "view": "transactions"
  },
  "pupeye_events": {
    "schema": "puppy_pupeye",
    "view": "events"
  },
  "pupeye_device_migrations": {
    "schema": "puppy_pupeye",
    "view": "device_migrations"
  },
  "pupeye_device_reputation": {
    "schema": "puppy_pupeye",
    "view": "device_reputation"
  },
  "pupeye_global_bans": {
    "schema": "puppy_pupeye",
    "view": "global_bans"
  },
  "pupeye_ban_targets": {
    "schema": "puppy_pupeye",
    "view": "ban_targets"
  },
  "pupeye_ban_events": {
    "schema": "puppy_pupeye",
    "view": "ban_events"
  },
  "pupeye_identity_links": {
    "schema": "puppy_pupeye",
    "view": "identity_links"
  },
  "pupeye_ban_hits": {
    "schema": "puppy_pupeye",
    "view": "ban_hits"
  },
  "pupeye_save_attestations": {
    "schema": "puppy_pupeye",
    "view": "save_attestations"
  },
  "pup_web_network_checks": {
    "schema": "puppy_pupeye",
    "view": "web_network_checks"
  },
  "pup_web_ip_bans": {
    "schema": "puppy_pupeye",
    "view": "web_ip_bans"
  },
  "pup_account_saves": {
    "schema": "puppy_game",
    "view": "cloud_saves"
  },
  "puppy_web_saves": {
    "schema": "puppy_game",
    "view": "legacy_web_saves"
  },
  "pup_system_notifications": {
    "schema": "puppy_game",
    "view": "notifications"
  },
  "pup_exchange_connections": {
    "schema": "puppy_exchange",
    "view": "connections"
  },
  "pup_exchange_offers": {
    "schema": "puppy_exchange",
    "view": "offers"
  },
  "pup_exchange_transfer_policy": {
    "schema": "puppy_exchange",
    "view": "transfer_policy"
  },
  "pup_exchange_privileged_gifters": {
    "schema": "puppy_exchange",
    "view": "privileged_gifters"
  },
  "pup_gift_requests": {
    "schema": "puppy_exchange",
    "view": "gift_requests"
  },
  "pup_admin_actions": {
    "schema": "puppy_admin",
    "view": "actions"
  },
  "pup_web_sessions": {
    "schema": "puppy_web",
    "view": "sessions"
  },
  "pup_web_activity_events": {
    "schema": "puppy_web",
    "view": "activity_events"
  },
  "pup_web_signup_limits": {
    "schema": "puppy_web",
    "view": "signup_limits"
  }
});
export function puppyTableLocation(table) {
  return PUPPY_SCHEMA_TABLES[table] || null;
}
export function puppyReadFrom(client,table,{useGrouped=false}={}) {
  const location=puppyTableLocation(table);
  if(useGrouped && location && typeof client?.schema === 'function')
    return client.schema(location.schema).from(location.view);
  return client.from(table);
}
