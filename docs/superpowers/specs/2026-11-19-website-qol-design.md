# Puppy Clicker website — link buttons and browser settings QoL
Date: 2026-11-19
Status: Approved by user request to implement with best-judgment QoL refinements

## Goal
Make textual website links visually recognizable as button controls and make /settings faster to navigate, without changing link semantics, cloud saves, games, or Android app code.

## Design decisions
- Preserve real `<a href>` semantics for navigation, Ctrl-click, keyboard support and external links. Style links as buttons, do not replace them with JavaScript `<button>` redirects.
- Apply button treatment across content links while leaving structural card hit areas, brandmarks and the static logo-only homepage footer unchanged. Navigation menus already render button-like controls.
- Add Browser Settings search and compact section shortcuts; keep all five sections visible by default for direct access and backward compatibility.
- Reduce redundant descriptions and panel spacing while keeping touch targets comfortably sized, focus rings visible and the layout responsive at the existing 960px CSS split.
- Add undo for the most recent browser-preference change. Do not clear offline gameplay queues, account data, notification permissions or device storage.

## Alternatives considered
1. Replace every link with `<button onClick>`: rejected; breaks browser accessibility and native navigation.
2. Require manually adding classes to every component: fragile, misses new links.
3. Reuse existing link-button design with scoped defaults and deliberate structural exclusions: selected.

## Verification
- Add Playwright coverage for button presentation, usable href, search/clear, undo, compact navigation and footer.
- Run website unit suite, build and Chromium end-to-end suite through PR CI before shipping.
