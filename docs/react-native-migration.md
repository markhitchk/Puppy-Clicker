# Puppy Clicker React Native migration

Source/reference application: `markhitchk/pup-clinker`  
Destination application: `markhitchk/Puppy-Clicker`

## Part 1 — Foundation and shared shell ✅

- Expo SDK 57 / React Native 0.86 / TypeScript.
- Android, iOS, and web from one source tree.
- Preserve Android package identity `com.harleytg.puppyclicker`.
- Expo Router shell with Play, Care, Roster, Shop, and Rewards.
- Shared game context proving cross-screen state.
- Original V1, V2, and Discord reward roster manifests moved into the destination repository.
- Existing Terms of Use and Privacy Policy moved into the destination repository.
- Public client configuration separated from secrets.
- EAS build profiles and CI validation.

## Part 2 — Canonical assets and branding

- Move the complete existing V1/V2/Discord puppy PNG inventory without re-rendering.
- Move app logo, PupEye logo, Harley's Studios branding, casino art, reward art, notification art, and other runtime images.
- Build a typed asset registry so React Native resolves bundled assets statically.
- Preserve transparency and exact filenames where compatibility depends on them.
- Add image-size and duplicate-asset validation.
- Wire real puppy artwork into Play and Roster.

## Part 3 — Core game, saves, economy, and progression

- Port click/progression math, care systems, shop, upgrades, prestige, XP, and achievements.
- Define a versioned TypeScript save schema.
- Preserve import compatibility for existing `.pupsave` data before changing encryption or storage formats.
- Add device persistence and migration tests.
- Keep gameplay logic independent of UI components.

## Part 4 — Feature parity UI

- Roster details, rename, how-to-unlock, and use-puppy flows.
- Rewards, seasonal/date-gated unlocks, Puppy Codes, and daily goals.
- Compact notification center and notification history.
- Profile, XP, achievements, settings, onboarding, support, and developer console.
- Casino hub and individual games, including scratch physics, wheel, slots, blackjack, Planko, and gacha.
- Puppy Exchange flows.

## Part 5 — Online systems, Discord, Supabase, and PupEye

- Supabase client layer using publishable client configuration only.
- Discord sign-in and role-based unlocks, including Developer role behavior.
- Remote feature flags and streamed catalog/reward data.
- PupEye authority, anti-cheat, global-ban checks, and support/reporting integrations.
- Keep service-role credentials, signing material, bot tokens, and webhook secrets server-side.

## Part 6 — Native parity, release, and cutover

- Push/local notifications, deep links, haptics, file import/export, sharing, and platform permissions.
- Android signed production builds and iOS signing through EAS/native credentials.
- Web production deployment.
- Cross-platform accessibility and responsive-layout pass.
- Regression tests against the Kotlin reference app.
- Cut over only after save compatibility and major feature parity are verified.

## Branch strategy

Each part uses a dedicated `migration/react-native-part-N-*` branch and pull request. Do not delete or rewrite the Kotlin reference implementation until Part 6 acceptance criteria are met.
