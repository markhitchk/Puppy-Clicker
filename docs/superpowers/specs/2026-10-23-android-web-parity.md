# Puppy Clicker Android → React 1:1 Parity Design

**Date:** 2026-10-23
**Source of truth:** `markhitchk/pup-clinker` default branch
**Target:** `markhitchk/Puppy-Clicker` React/Vite on Vercel
**Scope:** faithful feature, economy, visual, and account behavior without reducing Android functionality

## What exactly is the Android app?

`App/app/src/main/AndroidManifest.xml` declares `PuppyClickerV6Activity` as the sole launcher. The launched screen is not the earlier GameViewModel or generic `PuppyNavigationModel`. Its concrete `V6Tab` destinations are Play, Care, Shop, Prestige, Settings; Roster, Rewards, Casino and other screens are nested. `PuppyClickerV6ViewModel.kt` defines persisted game state. `PuppyEconomyV7.kt` defines active economy rules. `PuppyMainScreensRevamp.kt`, `PuppySettingsUi.kt`, casino UI/engines and `ui/theme/Theme.kt` define the actual appearance.

## Non-negotiable rules

- Use Android source/asset IDs, never generated substitute puppy images.
- The game's four currencies are Treats 🍪, Bones 🦴, Pup Coins 🪙, Casino Chips 🐾. Never silently collapse them into Treats.
- Passive Treat production is disabled. `AUTO` upgrades are paid bonuses every 10 legitimate taps.
- Bones arrive every 20 legitimate taps, Pup Coins every 250; 1/500 ticket drop weights are 7800 / 1550 / 500 / 130 / 20 basis points.
- Initial healthy care gives +1 Treat per tap. Care score at least 85 with bond at least 50 gives +2. Energy at/below 10 blocks taps.
- Care state belongs to each puppy, not the whole account; profile switches preserve individual needs and bond.
- Upgrades require Bone prices and sometimes rarity-locked tickets. Treat cost grows by integer-ceiled factors 155/100 or 135/100. Prestige skills change specific costs and benefits.
- Casino games accept **Casino Chips**, never Treats; only one-way conversion 10 Treats → 1 Chip. Native casino round field names ending in "Treats" are a legacy naming convention, NOT actual wager currency.
- Exact native five navigation destinations; secondary actions are available without inventing dead screens.
- Native gold/cream/wood table imagery, full logo, emoji and tap animations must be retained where used, not replaced by generic illustrations.
- No .pupsave import/export browser UX; passwordless Discord sign-in and authenticated cloud progression.
- PupEye security, single-device policy, bans, and anti-cheat may not be bypassed for a shared account. The browser does not possess Android Keystore signatures, and client-only saves are not authoritative.
- On mobile preserve accessible tap targets, safe area insets, a fixed five-tab bar and responsive tables; desktop must match expanded navigation and retain the same features.

## Architecture

Web UI is React, Vite and dedicated game engines. Core economy logic lives in `src/game.js`; casino outcomes in `src/casinoV7.js`. Browser event handlers perform local simulation for *web-only demo progression* and save through an RLS-protected user-owned Supabase row with compare-and-swap revision. Future server-authoritative transactions must replace client trust before Android cross-save or shared rankings. Supabase publishable URL/key may live in browser; service-role, Discord secrets and privileged PupEye session material may not.

## Native parity modules

| Android Kotlin | React target | Remaining |
|---|---|---|
| `PuppyEconomyV7.kt` & `PuppyClickerV6ViewModel.kt` | `src/game.js` | Fair-play transaction authority, native save migration |
| `PuppyMainScreensRevamp.kt` | `src/App.jsx` / `src/styles.css` | Pixel-diff mobile/desktop snapshots, transitions |
| `PuppyCareSystem.kt` | `src/game.js` | Care decay per puppy/timestamps and native profile migration |
| `PuppyProgression.kt`, `PuppyAchievementsV6.kt` | Rewards page | XP claim ledger and idempotency |
| `PuppyMonthlyRewards.kt` | Rewards page | Remote monthly daily-goal schedule and claim settlement |
| `PuppyRosterScreen.kt`, `DynamicPuppyRoster.kt` | Roster UI | v3+ assets, renaming, favorite, reward-only unlock |
| `PuppySlotsEngine.kt` etc. | `src/casinoV7.js` | Native visual animations, runtime guards, recovery |
| `PuppyBlackjackEngine.kt` & `PuppyBlackjackUi.kt` | Blackjack card UI | Split/double/hand rules, persisted round resume |
| `PuppyExchange*`, `PuppyGacha.kt` | New route/components | Not implemented |
| `PuppySettingsUi.kt`, `PuppyUiPreferences.kt` | Settings | Exact nested cards, theme/scale, accessibility |
| `DiscordSignupAuth.kt`, `PupAccountCloudSave.kt`, `SupabasePupEyeClient.kt` | Auth/storage adapter | Secure Android-Web identity and progression bridge |
| `PuppyNotificationCenter.kt`, `PuppyNotificationInboxUi.kt` | Browser notices | Notification history, channels, native support parity |

## Acceptance tests before 1:1 label

1. For each feature, derive deterministic input/output fixtures from the native Kotlin source and run against the JS engine; compare Treat, Bone, Coin, Chip, XP, ticket and care state after 1, 10, 20, 250 taps and every purchase/claim.
2. Capture Android launcher, all primary screens, nested systems and each casino on phone 360×800 and tablet/desktop expanded viewport. Compare live browser screenshot with the reference at the same density, theme and UI scale; inspect interaction overlays manually.
3. Verify per-puppy state, save/load, offline and multi-tab conflict behavior; test immediately after refresh and on slow mobile networks.
4. Use Supabase Auth plus same account to verify cloud revisions, sign-out isolation, one-device conflicts, PupEye bans/device migration and malicious payload rejection; DO NOT enable Android save writes until backend security tests pass.
5. Replay every interrupted casino round (before/after wager, outcome commit, network timeout, refresh) and verify that Chips are charged/settled once; confirm feature flags cannot hide accepted wagers.
6. Browser automation for all pages and touch interactions; no console errors, overflow or clipped buttons, at least keyboard/focus support and safe-area navigation.
7. Vercel preview builds, smoke test, release comparison; production only after tests, identity linking and owner approval.

## Deployment and integration constraints

Vercel project `puppy-clicker` is discoverable in team scope `harleytghq-8739` but the current integration returns 403 on team-scoped project operations. Authorization for that team is required before this agent can inspect or deploy there. Avoid duplicate projects or another Vercel team. Keep preview separate from production; do not publish an unverified claim of exact parity.

## Current status

The first Superpowers TDD slice ports tested Android V7 economy, care, Prestige, wallet, source casino payouts, six-game hub and canonical primary nav. It is intentionally a **partial implementation** of this design; the remaining modules above block the 1:1 label.
