# Puppy Clicker database layout v2 (non-destructive rollout)

> **Historical migration plan (v2):** All 36 original physical tables were moved successfully in v3 on October 29, 2026. The non-destructive read-view proposal below is obsolete. See [the verified v3 database architecture](database-layout-v3.md).


## Status: PupEye Web enabled; physical-table cutover still staged

The active Android product is **React Native**, in `markhitchk/pup-clinker/Mobile`. The old `App/` Kotlin implementation is an archived historical reference, not a deployment target. React Native uses its signed PupEye NativeModules/Edge Functions. No Android app may be forced to upgrade by a database rename.

**Live protection:** physical tables `puppy_pupeye.web_rate_buckets` and `puppy_pupeye.web_security_events`, and service-role-only RPCs `public.pupeye_web_gate` / `public.pupeye_web_admin_events`. Supabase `pup-web-auth` v17 enforces server-calculated account action limits; the Vercel web APIs enforce trusted-proxy IP blocks and their own budgets. Native hardware attestation is not available in a browser. The web activity/network tables still provide IP and User-Agent history for staff.

**Physical cutover not yet safe:** current production has 17 database functions with references to the original `public.pup_*`, `public.pupeye_*` or `public.puppy_web_*` objects, 12 functions using `ON CONFLICT` (not necessarily all on Puppy tables), and 64 Puppy-table foreign keys. Simply relocating 36 tables and recreating `public` as views would break PostgreSQL upserts and may break Supabase Realtime filters, client REST access, and references in active Edge Functions. The safe rollout must update SQL routines, server clients, Realtime publications, grants/RLS, and old-client compatibility before applying a single transactional physical cutover with backups and rollback rehearsals. Do NOT run a direct `ALTER TABLE ... SET SCHEMA` in production without this work.


**Phase 1 implemented:** six schemas with read-only `security_invoker` views.
The physical production tables, primary keys, FKs, triggers, permissions,
functions and RLS policies remain unchanged in `public` to avoid breaking
existing web and Android app installations, Edge Functions, RPCs, and upserts.
This is an organizational catalog, **not** a completed physical-table move.

**Important:** Do not expose these schemas to Supabase Data API for public roles
or flip the `PUPPY_GROUPED_DB_READS` feature flag until grants and API
exposure have been reviewed. `service_role` gets read-only grants on catalog
views and must stay server-side; no credentials belong in mobile or browser.

| Group | Grouped view | Canonical physical table |
|---|---|---|
| `puppy_accounts` | `accounts` | `public.pup_accounts` |
| `puppy_accounts` | `linked_devices` | `public.pup_account_devices` |
| `puppy_accounts` | `beta_links` | `public.pup_beta_account_links` |
| `puppy_accounts` | `credentials` | `public.pup_credential_links` |
| `puppy_accounts` | `pending_credentials` | `public.pup_credential_pending` |
| `puppy_accounts` | `recovery_requests` | `public.pup_recovery_requests` |
| `puppy_accounts` | `web_auth_links` | `public.pup_web_auth_links` |
| `puppy_accounts` | `discord_relay` | `public.pup_web_discord_relay` |
| `puppy_pupeye` | `installation_players` | `public.pupeye_players` |
| `puppy_pupeye` | `installations` | `public.pupeye_installations` |
| `puppy_pupeye` | `sessions` | `public.pupeye_sessions` |
| `puppy_pupeye` | `save_heads` | `public.pupeye_save_heads` |
| `puppy_pupeye` | `transactions` | `public.pupeye_transactions` |
| `puppy_pupeye` | `events` | `public.pupeye_events` |
| `puppy_pupeye` | `device_migrations` | `public.pupeye_device_migrations` |
| `puppy_pupeye` | `device_reputation` | `public.pupeye_device_reputation` |
| `puppy_pupeye` | `global_bans` | `public.pupeye_global_bans` |
| `puppy_pupeye` | `ban_targets` | `public.pupeye_ban_targets` |
| `puppy_pupeye` | `ban_events` | `public.pupeye_ban_events` |
| `puppy_pupeye` | `identity_links` | `public.pupeye_identity_links` |
| `puppy_pupeye` | `ban_hits` | `public.pupeye_ban_hits` |
| `puppy_pupeye` | `save_attestations` | `public.pupeye_save_attestations` |
| `puppy_pupeye` | `web_network_checks` | `public.pup_web_network_checks` |
| `puppy_pupeye` | `web_ip_bans` | `public.pup_web_ip_bans` |
| `puppy_game` | `cloud_saves` | `public.pup_account_saves` |
| `puppy_game` | `legacy_web_saves` | `public.puppy_web_saves` |
| `puppy_game` | `notifications` | `public.pup_system_notifications` |
| `puppy_exchange` | `connections` | `public.pup_exchange_connections` |
| `puppy_exchange` | `offers` | `public.pup_exchange_offers` |
| `puppy_exchange` | `transfer_policy` | `public.pup_exchange_transfer_policy` |
| `puppy_exchange` | `privileged_gifters` | `public.pup_exchange_privileged_gifters` |
| `puppy_exchange` | `gift_requests` | `public.pup_gift_requests` |
| `puppy_admin` | `actions` | `public.pup_admin_actions` |
| `puppy_web` | `sessions` | `public.pup_web_sessions` |
| `puppy_web` | `activity_events` | `public.pup_web_activity_events` |
| `puppy_web` | `signup_limits` | `public.pup_web_signup_limits` |

## Phase 2 rollout requirements

1. Audit every Edge Function, Vercel API, browser query, Android/Kotlin call and PostgreSQL RPC, especially ON CONFLICT/UPSERT and fully qualified public references.
2. Expose schemas only as needed with explicit grants and RLS tests; never grant anon/authenticated access to PupEye, network, ban, or admin internals.
3. Move read-only operations to the grouped schema, test via service-role, then plan transactional writes and compatibility for installed old clients.
4. Migrate physical tables only when all older clients retain verified compatibility; keep a tested rollback and complete backups. Do not modify ARC Ranked or HRN tables.
5. Verify registration, password/Discord sign-in, web and Android cross-play, economy transactions, account restrictions, device identity, IP blocks, exchange, and notifications.
