# Puppy Clicker — React Native Web website

The browser app uses **React Native Web** and the existing Vite/Vercel setup with a responsive desktop layout. Its screens currently remain a distinct React Native port, rather than a direct browser export of Android's `Mobile/App.js`. The Android entry uses native PupEye and device-bound `NativeModules`; their authority cannot be replaced by a simulated web native module.

The website now imports **actual mobile source files** for balanced XP and Kotlin V6 wallet formatting from [pup-clinker/Mobile](https://github.com/markhitchk/pup-clinker/tree/main/Mobile). Their copied source and upstream commit are recorded in `src/mobile/engine/SOURCE.json`.

**Cross-play:** The browser now reads verified Pup Account progress from the authoritative `pup_account_saves` table via the account-verified `pup-web-auth` Edge Function. Browser actions are server-calculated using the same Kotlin-compatible gameplay reducers as React Native beta, and use revision-checked compare-and-set writes. No browser sends balances, prizes, RNG, or raw save replacements. The previous `puppy_web_saves` data is retained as a legacy backup but is not imported or granted economic authority. If an Android cloud save is absent, web gameplay is disabled until the original app uploads its account save. Web gameplay requires an active PupEye owner installation, a verified account, and legal consent. Native-only features and remaining design parity still need validation. See [the coverage audit](docs/parity/2026-10-23-parity-audit.md).

## What changed

- Native five-tab navigation and responsive Play/Care layout, four currencies, original puppy artwork and live next-goal progress.
- Per-puppy care/timestamps/names, native daily goals/rewards, XP/achievements, roster filters/favorites, shop, accessories, prestige, capsule gacha and supported Puppy Codes.
- Dedicated casino screens; source payout tables; Blackjack single-deck hit/stand/double/split and saved-hand recovery.
- Light/dark/system theme, accents, contrast, motion preferences, profile and settings sections.
- Bundled original assets: 32 manifest puppies and 68 images verified against source SHA-256.
- Standalone Android preview configuration with embedded JS; no Metro connection is required for a release preview APK.

## Web

Node 22+:

```bash
npm ci
npm test
npm run build
npm run dev
npx playwright install chromium
npm run test:e2e
```

The Vercel root/build output remains `.` / `dist`. Avoid unnecessary deployments; keep migration previews separate from production. The connected Vercel scope `harleytghq-8739` returned 403 during this change, so direct deployment/inspection is not available until team access is authorized. No duplicate project was created.

## Android

```bash
cd mobile
npm ci
npx expo install --check
npm run export:android
npm run android
# Standalone APK through an authorized EAS account:
npm run apk
```

The preview package is `com.harleytg.puppyclicker.reactpreview`; it installs alongside the Kotlin app. `APP_VARIANT=production` preserves the final production package `com.harleytg.puppyclicker`, but production cutover is not approved while parity/secure save transfer remains incomplete.

GitHub Actions builds a release-mode preview APK, verifies the embedded JS bundle and uploads it as `puppy-clicker-react-preview-apk`. This preview uses a debug signing key, not your Google Play upload key. An Expo export proves bundling, not a successful device installation.

## Accounts and saves

The website now uses the same authoritative `pup_account_saves` row as Android. The browser no longer uses the web-only `puppy_web_save_commit` RPC. Guest sessions are intentionally not saved. Supabase publishable URL/key configuration is in `.env.example` (web) and `mobile/.env.example` (Android).

**Website Discord authentication:** The independent Puppy Clicker Discord application (client ID `1547982688898777118`) must register `https://puppy-clicker.vercel.app/auth/discord/callback` as an **additional OAuth2 redirect URL in the Discord Developer Portal**. The browser sends a Discord PKCE authorization request to that exact HTTPS callback, validates its state, exchanges the code through `pup-web-auth`, verifies the linked Pup Account, and then returns to `/play` (or the explicitly selected `/account` or `/recovery` page). The `discord-1547982688898777118:/authorize/callback` deep link remains app-only and is not a valid website redirect. Local development callbacks may be registered separately. Do not use ARC Raiders' Discord application or generic Supabase Discord OAuth: both risk linking the wrong identity. No server secrets belong in either public environment.

Native Discord OAuth continues to use its separate PKCE callbacks, including `puppyclicker-reactpreview://auth/callback` (preview) and `puppyclicker://auth/callback` (production), with Android cold-start and warm callbacks. Add these to the existing Supabase redirect allowlist when testing native sign-in.

**PupEye remains authoritative.** The browser is a non-device-bound companion using a verified Pup Account session, never a replacement for signed Android attestation. A browser cannot upload a raw cloud save or reset live progress. Keep database RLS strict and rely only on server-calculated, revision-checked gameplay actions. Proper authority, identity and single-device enforcement remain required.

## Source artwork

```bash
node scripts/sync-assets.mjs /path/to/pup-clinker
npm test
```

This copies original bytes, regenerates the roster/native static image registry, and records the Kotlin source commit and image hashes. No replacement/generated puppy artwork is used.

© Harley’s Studios.


## Keep native game rules in sync

`npm run sync:mobile-engine` downloads only two allowlisted pure JavaScript game-engine files from the authoritative [React Native app](https://github.com/markhitchk/pup-clinker/tree/main/Mobile) and records the exact source commit. Set `PUPPY_NATIVE_SOURCE_REF=<commit-sha>` to pin an earlier revision. Normal Vercel builds use the reviewed and committed copies, not unexpected network changes.

The scheduled/manual `Sync mobile game engine` workflow proposes upstream updates through a PR and runs tests and the Vite build before pushing. Additional UI and economy modules must be reviewed before adding them to the allowlist. Do not import native Keystore, PupEye, `AsyncStorage`, Discord Android callbacks, or other device-bound authorization into the website.


### Browser E2E testing without real account writes

`npm run test:e2e` serves Vite with `PUPPY_E2E_FIXTURE=1`, which swaps **only the dev server's** Supabase import for an isolated in-browser mock account and localStorage-backed test save. The normal Vercel production build uses the real Supabase client; the fixture alias is disabled for `vite build` even if the environment variable is set. This lets Playwright exercise authenticated gameplay without a real user's Pup Account or Supabase data.

## Web auth and casino repair

See [the diagnostic report and QA checklist](docs/reports/web-auth-casino-repair.md).

The Discord callback is **only** `/auth/discord/callback`; Supabase email enrollment and reset links return to **`/recovery`**. Register `https://puppy-clicker.vercel.app/recovery` in Supabase Auth's redirect allowlist and keep the HTTPS Discord callback registered in the Puppy Clicker Discord application. These callback types are handled separately; neither is an Android deep link. Keep using the same browser for PKCE email links.

Both the session client and the public web auth exchange now use `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. They must point to the same project hosting the existing Pup Account links and saves. Auth persists in browser storage, with no application session cookie or cookie-domain/SameSite setting. The server still verifies the bearer session, account standing and legal acceptance; every gameplay request also verifies the active PupEye owner installation and existing Android save.

A saved legacy Android casino round blocks new website wagers until that original round is finished and synchronized. The website now explains this and withholds the legacy deck. It never clears, refunds, re-rolls or settles that wager from browser input. Gacha and all supported casino transactions continue to use server RNG and revision-checked saves.

No new environment variable or database migration is required. Release the updated website and `pup-web-auth` together, retaining the function's existing authentication configuration. Do not rotate the existing server casino seed while Blackjack hands are open. No Android source or build configuration is changed by this repair.

## Vercel admin API configuration

The website's `/account/admin` page calls the **server-only** Vercel Function at `/api/admin`. To enable it, open Vercel → **puppy-clicker** → **Settings → Environment Variables** and configure these for **Production** (and Preview only if you want admin access on preview deployments):

- `SUPABASE_URL` — the same Supabase project URL used by the Puppy Clicker web login.
- `SUPABASE_SECRET_KEY` — a Supabase **server-side secret key** for that project; the API also supports the legacy `SUPABASE_SERVICE_ROLE_KEY` variable. Configure only one of these key names.

Store the secret **only in Vercel**, never in GitHub, a public `VITE_*` variable, logs, or client code. After updating the environment variables, redeploy the production deployment so the serverless function receives them. No public browser setting can substitute for this server-side credential. The admin API continues to verify the bearer session, active registered Pup Account, current staff role, and ban status on **every request** before performing audited actions. A missing key causes `ADMIN_BACKEND_NOT_CONFIGURED`; insufficient table permissions or missing tables may cause `ADMIN_DATA_UNAVAILABLE` instead. Do not weaken these checks to work around a configuration error.
