# Puppy Clicker — Android Parity Web Port 🐾

React + Vite web implementation based on the **actual Android launcher**
`App/app/src/main/AndroidManifest.xml` → `PuppyClickerV6Activity.kt` and its
`PuppyClickerV6ViewModel.kt`, `PuppyEconomyV7.kt`, care, progression, roster and casino sources in
[markhitchk/pup-clinker](https://github.com/markhitchk/pup-clinker).

> **Status: staged parity port, NOT a verified 1:1 release.** Do not label it as full Android parity or put its client-authoritative rewards into the protected Android cloud account.

## Android-to-web progress

| System | Status | Details |
|---|---|---|
| Launcher navigation | Partially ported | Native five bottom tabs: Play, Care, Shop, Prestige, Settings; quick access to Roster, Rewards, Casino |
| Economy V7 | Ported and tested | Treats, Bones, Pup Coins, Casino Chips; no passive Treats; 10-tap active bonus, 20-tap Bones, 250-tap Pup Coins; integer upgrade scaling |
| Tap, energy and care | Core ported | Healthy-care bonus, tired gate, care costs, energy drain, per-puppy care profiles |
| Shop | Core ported | Matching upgrade tickets, Bone costs, Pup Coin tickets/accessories, prestige skill discounts |
| Puppy roster | Partial | V1/V2 source PNGs, default unlocks, Discord Pup, profile selection; dynamic V3+ streamed art and reward unlocks pending |
| Daily / park | Partial | Daily claim, streak, Bones/Pup Coins, 60s park reward; monthly calendar/task schedule and XP ledger pending |
| Prestige | Core ported | 50k threshold, permanent skill tree, 1–8 points, reset economy, retain collection/Pup Coins/Chips |
| Casino | Engine parity progressing | Source payout tables for Slots, European Roulette, Scratchers, 8-row Plinko and Lucky Wheel; basic Blackjack; source art. Full animation, gameplay state recovery, card-specific reward unlock, Blackjack split/double not yet done |
| Supabase | Web-only secure scope | Discord OAuth, RLS-protected web save and revision checks |
| PupEye / Android cross-save | **NOT PORTED** | Android signed installation sessions, one-device authority and anti-cheat are not interoperable with web yet; the web client never writes PupEye account tables |
| Advanced systems | Pending | Notifications, achievement XP settlement, onboarding, gacha, puppy exchange, redeem codes, admin, feature flag parity, accessibility/theming |
| Visual 1:1 | Pending screenshots | Layout follows Android sections but Compose-vs-CSS screenshots and interaction tests are still required |

The reference audit and task-by-task Superpowers plan live in
`docs/superpowers/specs/2026-10-23-android-web-parity.md` and
`docs/superpowers/plans/2026-10-23-android-web-parity.md`.

## Run and verify

Node.js 22+ required:

```bash
npm ci
npm test
npm run build
npm run dev
```

`npm test` uses Node's built-in test runner and verifies Android-derived economy and casino rules.
GitHub Actions runs tests and builds for every PR. A green build is not proof of visual parity.

## Supabase

Current code uses publishable Supabase configuration only.
Override `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in an uncommitted `.env.local` if needed.
**Never** put service-role keys or Discord provider secrets in browser-side variables.

Auth providers: enable Discord under [Supabase](https://supabase.com/dashboard/project/damcmyqusdxucwozkoeh/auth/providers).
Provider callback (Discord Developer Portal): `https://damcmyqusdxucwozkoeh.supabase.co/auth/v1/callback`.
Allow the Vercel preview/production URL under [Supabase URL Configuration](https://supabase.com/dashboard/project/damcmyqusdxucwozkoeh/auth/url-configuration).
Anonymous guest gameplay is not saved.

`public.puppy_web_saves` is isolated from `public.pup_account_saves`. Existing Android signed PupEye saves cannot safely be read/written by a generic Supabase Auth browser token. Do not weaken RLS to enable cross-save. Proper 1:1 needs a separately reviewed identity-binding and server-authoritative transaction design.

## Vercel

The repo is configured for Vercel's Vite preset. Use `npm run build` and output directory `dist`.
Use a **preview deployment** from this feature branch until Android parity is verified.
Do not promote the current PR to a 1:1 production release.

A Vercel project named `puppy-clicker` exists under team scope `harleytghq-8739`, but the current connected account returned **403 forbidden** when inspecting its settings and deployments on October 23, 2026. The team scope requires authorized access before automated deployment/verification; do not create a duplicate Vercel project in an unrelated scope.

## Fair play and limitations

Because the React game economy currently runs in the browser, a user can manipulate **their own web save** even when ownership is protected by RLS. Browser reward generation cannot be treated as tamper-proof, and must never feed native Android, global leaderboards, or account-wide rewards until server-side validation / PupEye web parity has passed a security review.

Source character images load from the owner's original Android repository, rather than unlicensed replicas. Production should ship a versioned, optimized asset bundle when the full art manifests are ported.

© Harley's Studios. All rights to original Puppy Clicker code and artwork remain with their owner.
