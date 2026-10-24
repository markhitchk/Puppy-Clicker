# Kotlin → React parity audit and implementation record

Reference: `markhitchk/pup-clinker`, exact commit in `asset-manifest.json`.
Target: **both Android and web**, as confirmed by the owner. This remains a migration; there is no verified 100% parity claim.

## Root cause

The default branch contained a Vite-only partial implementation; the separate React Native migration branches contained placeholder Care/Shop/Rewards pages and a different economy (Puppy Points). Neither was the Kotlin launcher reproduced in React. Keeping unrelated UI/state implementations would keep producing different Android and browser behavior.

The fix uses **one shared React Native screen tree** (`src/app`) and game modules for Expo Android and React Native Web/Vite. The web remains at the repository root for the existing Vercel project. `mobile/` owns the native entry, platform adapters, build configuration and lockfile. No WebView wraps the website. Generated Android Java/Kotlin files are only the Expo/RN platform host; gameplay and UI live in React/JavaScript.

## Source-to-screen coverage

| Kotlin source | Shared React destination | Verified in this change |
| --- | --- | --- |
| Manifest → PuppyClickerV6Activity | UniversalApp | Five tabs, expanded rail, safe-area Android host, nested screens |
| PuppyMainScreensRevamp: Play | PlayCare | Four-currency wallet row, responsive portrait, care bonus, full-width tap button, next-goal progress |
| PuppyMainScreensRevamp: Care + PuppyCareSystem | PlayCare + parity | Per-puppy meters, five actions, 120-second active decay, capped offline decay, independent names/timestamps |
| PuppyMainScreensRevamp: Shop + EconomyV7 | Shop + game | Native upgrade groups, costs, Bone/ticket requirements, accessories and coin shop |
| PuppyMonthlyRewards / RewardsHub | Rewards + parity | Validated monthly goals/fallback, daily counters, claims, claimed list, next-goal update, streak, park |
| PuppyRosterModel / DynamicPuppyRoster | Roster + generated roster data | All 32 current manifest puppies, search/status/category/favorite/name sort, use, rename, locked details |
| PuppyProgression / AchievementsV6 | Settings Profile + parity | XP event amounts and idempotent achievement settlement; legacy XP migration |
| PuppyGachaEngine | Rewards Gacha + parity | Earned Treat/Common Ticket payment, non-reward pool, prefer unowned, capsule reveal, duplicate fallback |
| PuppyCodeModels / RewardGrantEngine | Redeem + redeem.js | Exact salted hashes, atomic supported reward bundles, replay denial; restricted/time/role rewards fail closed |
| V6Prestige | Prestige | Confirmation, points, skills, retained collection/currencies |
| BlackjackEngine / UI | Casino + blackjack | Single deck, naturals, soft 17, double, split (max three), split aces, automatic totals, persisted hands and one-time recovery |
| Slots / Roulette / Plinko / Wheel / Scratchers | Casino + casinoV7 | Dedicated screens and original art, published tables, wagers, roulette bet variants, result settlement |
| Theme / UiPreferences / Settings | ui + preferences + Settings | Light/dark/system, accent palette, contrast, motion toggles, compact numbers, settings search/sections |
| Discord signup / React web save | platform adapters + useAccount | Same isolated React cloud schema on both clients, native PKCE cold/warm callbacks and duplicate handling; no protected Kotlin save writes |

All 68 copied image assets retain their source SHA-256. `node scripts/sync-assets.mjs /path/to/pup-clinker` reproducibly refreshes portraits, manifests, casino artwork, native requires and hash inventory.

## Release and acceptance constraints still open

- **PupEye and Kotlin progress are not migrated.** Android signed installation sessions, one-device policy, bans, authoritative wagers/rewards and account transfer require a secure backend bridge. The React save table remains isolated. No RLS weakening or data reset was performed.
- **Not ported:** admin/moderation, player-to-player Puppy Exchange, server role grants, full support/report workflows, push/local scheduled notifications, seasonal/birthday claim flows, advanced motion/performance settings and exact original onboarding/privacy flows.
- Session notification history is local UI state, not the Kotlin persistent notification/reward center.
- Casino visuals are functional ports, **not pixel-verified native equivalents**. Scratch currently reveals by tapping; native scratch-mask gesture coverage, exact wheel alignment, full Plinko artwork/physics and interrupted-round server recovery remain incomplete. Wheel puppy slices refund until verified reward settlement exists.
- UI scale currently changes spacing; full native density/font-scale equivalence remains unverified. Accessibility/device screenshot comparison needs native execution.
- Monthly schedules use validated network/fallback data but do not yet persist the downloaded month cache between launches.
- Android OAuth requires the Supabase redirect allowlist to include `puppyclicker-reactpreview://auth/callback` (preview) and `puppyclicker://auth/callback` (production). Live sign-in/role/cloud end-to-end behavior has not been verified with a real account.
- Actual APK install, physical device launch, native process recreation during OAuth, Play signing/version migration and Kotlin reference screenshot diffs are **not verified by an Expo export**.

## Android packaging

Default local/previews use `com.harleytg.puppyclicker.reactpreview` and a distinct app label, protecting the installed Kotlin app during migration. Only `APP_VARIANT=production` uses `com.harleytg.puppyclicker`. Production cutover is blocked until the items above are verified.

EAS preview is a standalone APK with `developmentClient: false`; production is AAB. The CI build generates a release-mode **debug-key-signed preview APK**, checks `assets/index.android.bundle` exists, and uploads it. It is not Play-signed and must not replace the Kotlin release.

## Verification record

- Gameplay/native lifecycle unit suite: source Blackjack fixtures, economy/care/rewards/roster/XP/code claims, PKCE callback dedup/retry, original asset hashes and preview packaging contracts.
- Browser journey verified at 360×800, 768×800 and 1280×800: onboarding, taps/next reward, puppy change, care, daily gift/goal claims, theme persistence and horizontal overflow. These tests do not establish visual equivalence or real-account sync.
- Vite production build, Expo package compatibility check, Android prebuild and Android Hermes/asset export run locally.
- Independent code review found foreground/background care, slow-save sign-out and cold-start OAuth bugs; regression tests and fixes were applied. Saved-round recovery validation was also hardened.
- Browser runtime in this container required a local Chromium binary; CI uses Playwright’s supported browser download.

## Execution decisions

- Shared React Native components replace the separate Vite UI so both requested platforms run the same screens. Risk: this changes browser rendering and requires regression screenshots; three browser sizes are covered, exact Kotlin diffs are still pending.
- Preview application ID is separate until migration acceptance. Risk: preview users must install a second app; protected Kotlin progress stays untouched.
- Continue using isolated React cloud saves. Risk: users cannot yet move Kotlin progress into this version; this avoids accepting client-generated progression into PupEye-protected accounts.
