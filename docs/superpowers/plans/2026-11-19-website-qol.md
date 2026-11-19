# Website links & browser settings QoL — implementation plan
Date: 2026-11-19
Spec: docs/superpowers/specs/2026-11-19-website-qol-design.md

## Task 1 — Base link styling
- Update shared button CSS for text anchors in site content, excluding branding, cards and footer.
- Keep existing CTA and menu styles, href behavior, focus indicators and reduced-motion settings intact.
- Prove: Playwright checks nondecorative anchors use a button-like surface and preserve destination.

## Task 2 — Browser Settings navigation and density
- Extend BrowserSettings with quick search, category shortcuts and clear search.
- Keep panels in the DOM and visible by default; no storage semantics changes.
- Compact shared controls and use viewport-specific mobile/desktop styles.
- Prove: search matches the intended panel and clear restores every section; no viewport overflow.

## Task 3 — Preference recovery QoL
- Add one-level Undo for preference edits/resets, preserving the save function.
- Keep error/success feedback in the existing live region.
- Prove: an edited theme returns to the prior saved value on Undo.

## Task 4 — Release checks
- Open a PR against main; inspect CI and Vercel outputs.
- Merge only with verified green web tests/build and no blocking review or regression.
- Ensure main production deployment is READY before claiming it is live.
