# Android-to-Web 1:1 Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reproduce Android Puppy Clicker V6/V7 faithfully in a React web app, with verified visual, gameplay, cloud and security parity before Vercel production.

**Architecture:** Kotlin Android launcher/ViewModel is the normative spec, not the previous web prototype. Separate pure TypeScript/JavaScript engines, React route/screen components, shared UI design tokens and secure Supabase adapters. Keep web-only save until server-authoritative PupEye browser linking exists.

**Tech Stack:** React 19, Vite 8, Node built-in test runner, Supabase Auth/Postgres/Edge Functions, Vercel Git preview deployments, Playwright screenshot and E2E tests (to add).

**Spec:** `docs/superpowers/specs/2026-10-23-android-web-parity.md`.

## Global Constraints

- Do not edit or reset Android saves, PupEye database records or live bans.
- Never commit server/service-role/API secrets.
- Use tests first; RED → GREEN → REFACTOR per unit, then source-linked commit.
- Confirm Android launcher source before adapting UI; Native `V6Tab` = Play/Care/Shop/Prestige/Settings.
- A successful Vite build is not evidence of full feature parity.
- Limit deploys; deploy only a reviewed preview branch to the existing team/project.
- Mark incomplete features explicitly; no simulated screen may masquerade as full native implementation.

## Task 1 — Android source audit and reference manifest

**Files:** `docs/superpowers/specs/2026-10-23-android-web-parity.md`, future `src/nativeParityManifest.js`

- [x] Read manifest to confirm active launcher.
- [x] Read source economy, navigation, care, Prestige and six casino engine contracts.
- [ ] Enumerate **every** actively reachable Compose screen/dialog, record route/access path, actual screenshots and feature flags.
- [ ] Record all v1/v2/v3+ images, UI resources, animations and typography. Generate asset build to remove dependency on GitHub Raw.
- [ ] Commit screenshot fixtures and visual parity checklist.

## Task 2 — V7 game core and tests

**Files:** `tests/game.test.js`, `src/game.js`

- [x] Add failing deterministic taps/bones/coins/care/pricing tests; verify failure in GitHub CI.
- [x] Port Android core constants, pricing, care, wallet and upgrade purchase to pure JS.
- [x] Verify green Node test/CI.
- [ ] Port fully accurate care decay, fatigue over real elapsed time, per-puppy save timestamps and suspicious tap rate handling via authoritative backend.
- [ ] Add native Kotlin-generated fixtures and JS property tests (overflow and concurrency).
- [ ] Replace V7 legacy compatibility defaults only after official migration round-trip tests.

## Task 3 — Casino engine parity

**Files:** `tests/game.test.js`, `src/casinoV7.js`, later `src/casino/`

- [x] RED deterministic tests for Slots/European Roulette/Scratchers/Plinko/Wheel payout tables.
- [x] Implement native payout calculations and validate GREEN.
- [ ] Add six dedicated screens, dynamic artwork, animations, scratch mask, wheel and Plinko physics display.
- [ ] Port Blackjack deck/shoe, actions, dealer AI, double/split, hand state and exact RTP.
- [ ] Move wager/resolution into idempotent authenticated **server** transactions; support accepted/committed/recovered states and downtime refunds.
- [ ] Reproduce native win tickets/puppy rewards and limits with auditable ledger. Never mint account-wide rewards client side.

## Task 4 — Launcher/screen/interaction fidelity

**Files:** `src/App.jsx`, `src/styles.css` → componentize `src/screens/*`, `src/ui/*`

- [x] Align bottom primary tabs with launcher and add first playable Android Play/Care/Roster/Shop/Rewards/Casino/Prestige flows.
- [x] Import canonical Material3 dark palette from `ui/theme/Theme.kt`.
- [ ] Port native light/system theme, accent override, compact/large density and font scaling.
- [ ] Port onboarding, complete Settings submenus, notification panel, role labels, developer-guarded pages, profile, error handling.
- [ ] Add responsive Android phone/tablet reference screenshot comparisons with reduced-motion and accessibility checks.
- [ ] Split large JSX module into small tested screen/component units.

## Task 5 — Account, cloud save and PupEye consistency

**Files:** existing `src/supabase.js`, new `src/auth/*`, `supabase/functions/*`, `supabase/migrations/*`

- [x] Keep web saves separated under owner-only RLS while prototyping.
- [ ] Design validated Discord Supabase Auth → PupEye player/device association with one-device authority, transfer requests and global ban checks.
- [ ] Add protected Edge Functions for atomic validated cross-platform transactions, tamper/rate controls and save revisions.
- [ ] Port cloud schema in both directions with versioned compatibility (all currencies, per-puppy bond/care, achievements, casino recovery).
- [ ] Threat-model malicious browser, replay, duplicate OAuth identities and rollback; test denied RLS and auth policy scenarios.
- [ ] Enable actual Android-Web sync only after passing complete security tests.

## Task 6 — Missing gameplay systems

- [ ] Port exact monthly daily tasks and claim schedule.
- [ ] Implement achievements + account XP idempotent payouts, labels and status.
- [ ] Port redeem codes, reward dialogs and feature flags; prevent unauthorized role unlock.
- [ ] Port Puppy Gacha and Puppy Exchange with anti-abuse/ledger/backend.
- [ ] Port in-game notices, admin system, role display and all usable settings.
- [ ] Port cosmetic animations, paw cursor, audio/haptics where supported in browser.

## Task 7 — Verification and Vercel preview release

**Files:** `.github/workflows/react-web-ci.yml`, `tests/e2e/*`, `vercel.json`

- [x] Build and Node tests green after current economy/casino/Prestige slices.
- [ ] Pin browser tests and screenshot artifact runner; gate PR on screenshots/economy/security.
- [ ] Resolve Vercel team `harleytghq-8739` 403 team authorization in connection.
- [ ] Inspect existing `puppy-clicker` project Git link; do not create duplicate.
- [ ] Deploy **preview** from this PR's exact green commit; smoke-test navigation and Supabase OAuth callbacks.
- [ ] Complete remaining parity/security tasks; only then create an explicitly approved production deployment.
- [ ] Run post-deploy error logs and rollback readiness check.

## Release definition

1:1 may be claimed only when **every** active Android screen and gameplay action has a matching functional browser behavior or clearly documented platform-specific equivalent, golden tests and screenshot diffs pass, and the same secured account progression works across Android and Web without bypassing PupEye.
