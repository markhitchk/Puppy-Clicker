# Puppy Clicker — full React Native Web source migration

## Implementation
- Source: `markhitchk/pup-clinker/Mobile` pinned at commit `f35ad86ea874671bc05a3ab3dedde5bf97bbc06b`.
- Target: `markhitchk/Puppy-Clicker/src/native`, using React Native Web in Vite.
- Original Android React Native Play, Care, Roster, Shop, Rewards, Casino (Slots, Blackjack, Scratchers, Roulette, Plinko, Lucky Wheel), Gacha, Prestige, Settings, Exchange, notifications and supporting UI/engine modules are copied into `src/native` and rendered from the original `PuppyApp`. Mobile remains the source of truth.
- Browser-specific adapters: `src/native/src/state/useGame.js`, `useNotifications.js`, `src/native/web/*`, `webCompat.js`, `webSafeArea.jsx`, `webStorage.js`.
- Desktop: persistent navigation sidebar, wider content area, player and wallet sidebar above 1000px. Phone/tablet preserves actual app bottom tabs.

## Account / save boundary
- Login required. No anonymous guest game state is written.
- Browser uses the website's existing owner-authenticated `puppy_web_saves` row via revision-CAS `puppy_web_save_commit`. The React Native save is stored under `save_data.nativeGame`, preserving any legacy `save_data.game` instead of silently destroying it.
- This **is not a server-authoritative signed PupEye installation**, even though the browser renders the Android application. The website must not unlock the signed native device, transfer protected Android progress, bypass bans, or gift privileged assets without verified server endpoints.
- Account identity in browser currently accepts Supabase Discord OAuth or existing email/password auth. Original Kotlin device-bound native-only account APIs require an explicitly designed secure browser flow; no native Keystore or Android device module is emulated.

## Rendering and assets
- The source static image references are converted to React Native Web `Image` URI sources. Existing static V1/V2/logos and casino artwork use `/assets/`. Missing binary-only artwork currently uses pinned public source GitHub raw URLs; those should be mirrored to local `public/assets` for best performance before final release.
- Binary graphics from another repository were not republished via GitHub API because those APIs did not permit safe byte-preserving transfer in this workflow.

## Commands
```sh
npm ci
npm test
npm run build
npm run test:e2e
```

## Verification
- New responsive tests in `e2e/mobile-app.spec.js` use an isolated dev-server-only Supabase fixture.
- `tests/native-web-source.test.js` verifies the actual RN source structures are present.
- Existing Android preview CI job is separate; web changes do not upgrade the Play package.

## Remaining parity/security work
A full *shared UI source* is not the same as a fully shared *signed service*. Before a claim of 100% production functional parity, the signed PupEye and native-specific gifting, Exchange, notifications and server-authoritative economy need browser-specific endpoints and independent security and device testing.
