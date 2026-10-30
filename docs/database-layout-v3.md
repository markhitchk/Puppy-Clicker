# Puppy Clicker database schema v3 — physical migration complete

## Production status (October 29, 2026)

**36 original physical Puppy Clicker tables have been moved** from `public` into six dedicated schemas, in a single successful transaction. The two new physical PupEye Web security tables remain in `puppy_pupeye`, for **38 canonical tables** in the new schemas. All unrelated ARC Ranked, HRN, and other project tables remain in their previous locations.

| Purpose | Physical tables | Schema |
| --- | ---: | --- |
| Registered Pup Accounts, credentials, recovery and identity links | 8 | `puppy_accounts` |
| PupEye Android enforcement, device records, web IP checks/bans, PupEye Web security | 18 | `puppy_pupeye` |
| Shared cloud saves, older web save, system notifications | 3 | `puppy_game` |
| Friends, offers, transfer policy, gifting | 5 | `puppy_exchange` |
| Administrator audit actions | 1 | `puppy_admin` |
| Website sessions, browser activity, signup limits | 3 | `puppy_web` |

The original table names, such as `public.pup_accounts`, `public.pup_account_saves`, and `public.pupeye_players`, now resolve to **updatable `security_invoker` compatibility views**, not duplicate data tables. The underlying canonical physical tables are `puppy_accounts.pup_accounts`, `puppy_game.pup_account_saves`, and `puppy_pupeye.pupeye_players`. There is only one physical row set.

### Compatibility and security

* Supabase's native PostgREST server, Vercel API routes and shipped React Native Android versions continue using the original `public` REST URLs where needed. An ordinary view supports SELECT/INSERT/UPDATE/DELETE, but **not PostgreSQL `ON CONFLICT` upsert**.
* PupEye sync, device registration, beta links, credentials and Puppy Exchange now use **service-role-only RPC upserts** against the canonical physical tables. These five live Edge Functions were deployed before the atomic table move.
* PostgreSQL public routines referencing affected tables were rewritten to fully qualified canonical relations, preserving database-side `ON CONFLICT` operations, foreign keys, constraints, RLS and trigger attachment.
* No client gets service-role secrets. Protected grouped schemas are not publicly exposed through Supabase Data API. `authenticated` retains scoped access to the historical `puppy_web_saves` compatibility view where its existing RLS policy permits it.
* The separate website PupEye Web server checks and the Android device-bound PupEye authority continue to use the same registered Pup Account identity and rules. A browser does not claim native device attestation.
* Direct Supabase Realtime `postgres_changes` subscriptions should refer to the **new physical schema**. Existing trigger-based account realtime/broadcast triggers survived the move. Deploying a schema-aware client subscription should be validated separately if present.

### Verification

* Supabase migration `physical_puppy_schema_cutover_v3` completed successfully.
* The production catalog reports 36 moved original physical tables plus 2 independent PupEye Web security tables; RLS remains enabled on all 38 canonical tables.
* Counted all 36 canonical tables against their public compatibility views: **36 of 36 match**.
* Confirmed service-role SELECT/INSERT/UPDATE grants on all 36 canonical tables.
* Confirmed public compatibility views accept standard INSERT/UPDATE and remain security invoker.
* Verified scoped authenticated web-save access and service-only upsert RPC permissions.
* Tested service-role upsert paths inside rolled-back SQL transactions and rehearsed the reverse migration in a rolled-back transaction.
* Full browser/Android authenticated end-to-end testing remains required before claiming all gameplay and sign-in flows validated, especially after releases or cache changes.

### Emergency rollback

See `supabase/sql/physical-puppy-schema-rollback.sql`. This moves canonical tables back to `public` and reverts the SQL-function table references. It was rehearsed without committing changes. The rollback must be executed as one transaction in a maintenance window and followed by verification; do not drop data.

### React Native target

The active Android application is `markhitchk/pup-clinker/Mobile`, using native verified PupEye Edge Functions. The archived Kotlin `App/` application is not the Android deployment target. No gameplay feature, guest-mode authority, or cloud-save ownership rule changes as a side effect of moving tables.

### Deployment

The migration is live in Supabase. A new version of the website source is committed to GitHub main, but Vercel production deployments may be blocked by the daily quota. Confirm a successful deployment and CI checks separately; do not equate a Git commit with a live website release.
