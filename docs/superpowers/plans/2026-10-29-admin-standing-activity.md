# Admin Standing and Activity Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline. Track completion below.

**Goal:** Add account suspension/timed bans and readable, working website activity and device reporting.

**Architecture:** Extend shared PupEye restriction enforcement. Private session/event tables feed authenticated staff APIs; browser presence and server auth outcomes provide distinct evidence sources.

**Tech Stack:** React, Vercel Node functions, Supabase Postgres and Deno Edge functions.

**Spec:** `docs/superpowers/specs/2026-10-29-admin-standing-activity-design.md`

## Global Constraints

- Registered accounts only in directory; no installation/save/economy changes.
- Never record secrets, OAuth parameters, raw exceptions or arbitrary payloads.
- Suspension requires a future expiry; bans support permanent or future expiry.
- Staff authorization is reread on every API request; browser reports cannot assert auth success.

## Review Focus

- Expired restrictions stop applying even without a scheduled expiry job.
- Guest reports cannot attach another account or forge successful sign-in.
- Active session counts exclude hidden/ended/stale sessions and duplicate auth events.
- Activity storage failure cannot fail successful auth or gameplay.
- Refresh preserves filters and does not flood the audit log.

### Task 1: Restriction controls

**Files:** `api/_lib/adminPolicy.js`, `api/admin.js`, `src/adminPresentation.js`, `tests/admin-standing-activity.test.js`.
**Interfaces:** `validateRestrictionInput(body)`, `restrictionStanding(bans, now)`; `suspend-account` and existing ban/unban API actions.

- [x] Add/run failing tests for suspension expiry, invalid duration/type, role protections, and effective standing after expiry.
- [x] Implement validation, atomic existing ban RPC use, standing enrichment and friendly audit presentation.
- [x] Run focused tests; expected all pass.

### Task 2: Activity collection and private storage

**Files:** new migration, `api/activity.js`, `api/_lib/webActivity.js`, `src/webActivity.js`, `src/NetworkCheckReporter.jsx`, Edge auth activity helper.
**Interfaces:** `normalizeBrowserEvent(body)`, `recordWebActivity` RPC, server auth recorder; `activity` staff API action.

- [x] Add/run failing tests for spoofed success events, bounded sanitized paths/errors, server-verified auth outcome classification, stale presence, and nonfatal persistence failures.
- [x] Create private/RLS tables and service-only recording RPC; capture sessions and explicit safe events, instrument auth outcomes.
- [x] Run tests, apply additive migration, verify privileges/constraints and rollback a synthetic telemetry write.

### Task 3: Staff UI and release

**Files:** `src/AdminPortal.jsx`, `src/AdminPortal.css`, admin UI smoke checks, account activity privacy notice.

- [x] Add working duration presets/custom expiry, lift restriction controls, named logs, device/session and auth-event sections with filters.
- [x] Run full unit suite and production build; render the staff flow and fix observed issues.
- [ ] Deploy verified backend and existing Vercel site; verify deployed version and report limits.

## Execution ledger

- Investigation: `pup_web_network_checks` is absent; reporter is build-flag gated; auth auditing has no integration; UI exposes JSON and IDs directly.
- Ruling: use the fresh task-specific clone/feature branch as isolated workspace and execute inline under the user's requested changes; no additional design approval required.

- Task 1 complete: future expiry, timed/permanent options, shared enforcement, transactional audit and staff guards verified.
- Task 2 complete: migration applied, RLS/client privileges checked; synthetic SQL integration tests and service-role checks rolled back successfully. No installation or save records were committed by tests.
- Task 3 implementation complete: 208 unit/render tests pass; production build passes. Independent review found no remaining Important/Critical issues. Browser interaction QA is unavailable: browser download archives were invalid and the cloud browser cannot reach the local preview.
- Ruling: preserve the concurrent main-branch signup permission migration when integrating; it is independent of this work.

- Final performance check: successful gameplay response streams are not consumed by optional auth auditing. Regression failed before the guard and passed afterward.

- Integration ruling: preserved concurrent main changes cb7c6aa/280bd92, including /api/presence, its path/UUID safety tests, account privacy notice, and separate connection response contract. The richer reporter supersedes the older heartbeat while preserving opt-in ProxyCheck behavior.
- Release blocked: automatic approval review rejected updating main without explicit authorization. Prepared draft PR #39 instead; production auth instrumentation is unchanged.
