# Web authentication and casino repair plan

Goal: stop one-use callback races, expose safe failures, and verify server-authoritative casino/gacha transactions.

Spec: the two-issue engineering request supplied in this session.
Constraints: preserve PupEye, legal consent, Android saves, server RNG and revision CAS; no production account mutations or automatic wager settlement.

- [x] Add failing callback concurrency/error tests; implement one callback attempt per browser flow, explicit errors and verified navigation. Cover email PKCE callbacks too.
- [x] Add integration tests executing the actual server reducers and CAS gateway. Reproduce the legacy Android round blocker and redact its deck; explain recovery without deleting the wager.
- [x] Exercise web UI with isolated fixtures: callback success/failure, casino settlement, gacha result/inventory, duplicate input and conflicts. Remove unused web RNG inputs, surface safe action errors and prevent duplicate writes.
- [x] Run the full unit suite, web build, browser E2E, and available Android export checks. Document any exact environment limitations and upstream differences.

Review focus: duplicate Strict Mode effects; expired/denied callbacks; missing/revoked owner or save; simultaneous Android/web revisions; interrupted or ambiguous wager writes.

Decision: legacy Android WAGER_ACCEPTED rounds must be finished on Android. Their stored client deck is not promoted to server authority; the browser receives no legacy shoe. This preserves a real outstanding wager and leaves native recovery intact.


Verification: 119 unit/integration tests and 50 browser tests pass; web build passes. Author review and separate reviewer found duplicate suppression needed to be restricted to casino/gacha; fixed and covered by delayed distinct care-action E2E. Callback E2E now begins signed out and emits Auth events. The Android export probe failed on an empty generated PNG; no Android files were modified. No production writes or deployment performed.
