# Desktop Responsive Reference Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the supplied desktop Puppy Clicker dashboard reliably at desktop-site viewport widths and fix account-action wrapping.

**Architecture:** Keep existing NativeApp and CSS system; coordinate React Native Web layout decision and media queries at a single 960px boundary. Use the checked-in scene asset with a contrast-safe overlay. Changes are isolated to web UI presentation and browser tests.

**Tech Stack:** React, React Native Web, Vite, CSS, Playwright.

**Spec:** docs/superpowers/specs/2026-10-28-desktop-responsive-reference.md

## Global Constraints
- Do not modify Android source, Supabase, cloud saves, gameplay engine or authorisation.
- Keep dedicated mobile game layout below 960 CSS px.
- Match sidebar, top level/streak panels, central puppy scene, right resource/goals/care column above 960px.
- Keep browser account controls fully accessible and readable at 360px and larger.

## Review Focus
- Desktop-site viewport at 960/980px is desktop, not narrow 720px mobile layout.
- A small 390px screen does not overlap account links.
- At 1000x600 the care/status and next-reward panels are visible.
- Animated and reduced-motion puppy artwork is unaffected.
- The background asset is reachable and is desktop-only.

### Task 1: Regression tests
- [ ] Update e2e desktop suite to require nighttime scene instead of forbidding it.
- [ ] Add 960px and 980px breakpoints to desktop layout tests.
- [ ] Add mobile homepage account-link no-overlap test.
- [ ] Confirm these assertions do not pass on baseline (static source checks).

### Task 2: Desktop layout and scene
- [ ] Synchronize React desktop selection and web media queries at 960px.
- [ ] Use existing scene image behind desktop puppy, preserving the current foreground.
- [ ] Validate source breakpoint consistency and availability of scene asset.

### Task 3: Account actions and verification
- [ ] Apply mobile home link spacing and a full-width account refresh action.
- [ ] Review diff for unintended scope changes.
- [ ] Use CI test/build/browser results; report any checks not run.
