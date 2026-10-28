# Puppy Clicker — React Native Web website

The browser app uses **React Native Web** and the existing Vite/Vercel setup with a responsive desktop layout. Its screens currently remain a distinct React Native port, rather than a direct browser export of Android's `Mobile/App.js`. The Android entry uses native PupEye and device-bound `NativeModules`; their authority cannot be replaced by a simulated web native module.

The website now imports **actual mobile source files** for balanced XP and Kotlin V6 wallet formatting from [pup-clinker/Mobile](https://github.com/markhitchk/pup-clinker/tree/main/Mobile). Their copied source and upstream commit are recorded in `src/mobile/engine/SOURCE.json`.

**Security boundary:** Browser sign-in saves to `puppy_web_saves`, **not** the Android signed PupEye/Pup Account cloud-save format. Web and Android progress do not yet synchronize. Unauthenticated visitors cannot mutate gameplay. Native UI, secure account migration, player exchange, device permissions, push notifications and remaining systems still require a browser-safe port. See [the coverage audit](docs/parity/2026-10-23-parity-audit.md).

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

Both React platforms use the existing `puppy_web_saves` table, owner RLS and revision-checked `puppy_web_save_commit` RPC. Guest sessions are intentionally not saved. Supabase publishable URL/key configuration is in `.env.example` (web) and `mobile/.env.example` (Android).

Native Discord OAuth uses PKCE and `puppyclicker-reactpreview://auth/callback` (preview) and `puppyclicker://auth/callback` (production), including cold-start and warm callbacks. Add that redirect to the existing Supabase project’s allowlist before testing native sign-in. Browser sign-in returns to the current origin/path. No server secrets belong in either public environment.

**Kotlin `pup_account_saves` and signed PupEye installations remain separate.** Do not weaken RLS, transfer React-generated currency into protected accounts, reset live progress, or claim existing Kotlin accounts are already migrated. Proper authority, identity and single-device enforcement remain required.

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
