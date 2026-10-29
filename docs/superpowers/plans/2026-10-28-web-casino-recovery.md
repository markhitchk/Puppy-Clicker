# Web casino recovery implementation plan

Goal: Restore web casino access when an obsolete accepted Blackjack wager blocks every game, without changing Android code or trusting browser payouts.

Architecture: Build on the unreleased web repair branch. A web-only, authenticated intent refunds a valid incomplete legacy Blackjack wager older than 24 hours using the original Kotlin refund semantics. It records completion and refunds in the same revision-checked write. Committed outcomes and malformed saves fail closed. The browser gets recovery metadata, never the old deck. New rounds still use the existing authoritative casino reducers.

- [x] Add failing gateway tests for recovery, one-time refund, concurrency, invalid/committed/recent rounds, missing owner, overflow and redaction.
- [x] Implement recovery in pup-web-auth only; expose recovery metadata and a web casino control with visible receipt/error and busy state.
- [x] Exercise all six games through browser controls, including pending/reload and scratch gestures. Use the actual server reducers in the isolated test fixture.
- [x] Add site-wide inspection shortcut/context-menu deterrents, explicitly disable production source maps, and verify ordinary form shortcuts remain usable. This cannot conceal downloaded JavaScript.
- [x] Run unit/integration suite, browser suite and production build; inspect diff for mobile/shared-server changes.
- [ ] Commit and release the web and pup-web-auth together.
