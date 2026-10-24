# Puppy Clicker — shared React Android and web

The Android and browser versions now use **the same React Native screens and JavaScript game engines**. Expo renders native Android views; React Native Web renders the existing Vite website. The Kotlin repository remains the reference.

**This is still a parity migration, not a verified 100% replacement.** Protected Kotlin/PupEye save linking, admin, player exchange, push notifications and remaining native interactions are open. See the [source coverage and remaining work](docs/parity/2026-10-23-parity-audit.md).

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
