# Permanent website requirement: browser Developer Tools access

**Priority:** Permanent compatibility policy  
**Scope:** The entire Puppy Clicker **website**, including `/`, `/play`, `/settings`, `/account`, `/recovery`, PupEye pages, administration pages, and all future routes, regardless of authentication or guest status.

## Required behavior

The website must **not block, detect, obstruct, or interfere with browser Developer Tools** in Chrome, Edge, Firefox, Safari, Brave, Opera, and other Chromium-based browsers.

- Allow browser-defined DevTools shortcuts, including **F12**, **Ctrl+Shift+I**, **Ctrl+Shift+J**, **Ctrl+Shift+C**, and platform equivalents (such as macOS Command+Option+I), when supported by the browser.
- Allow **Right-click → Inspect** and ordinary context menus; do not suppress `contextmenu` events globally.
- Allow access to the **JavaScript Console, Network, Sources, and Elements** panels, and browser **View Source** shortcuts (for example Ctrl+U).
- Do not install DevTools-detection scripts, repeated `debugger` traps, viewport-difference detection, console-clearing or console-overriding traps, self-debugging loops, DevTools-triggered redirects, or forced-close behavior.
- Do not cancel the browser's keyboard shortcuts with global key handlers. Application-specific controls (for example Escape to close a modal) may continue to function, but must not intercept DevTools shortcuts.
- Do not disable text selection, copying, or right-click merely to deter inspection.
- Do not apply a different restriction to guests, logged-in users, suspended accounts, or admin pages.

A website cannot force the browser or operating system to support a particular shortcut or panel. This requirement means **Puppy Clicker itself must not block or interfere with them**.

## Security and PupEye

Browser content and JavaScript are inspectable and cannot be trusted as the source of economic authority. **PupEye anti-cheat remains enabled**. Security comes from **server-side authentication, authorization, session and account validation, input validation, rate limits, server-owned calculations and randomness, revision-checked saves, audit logging, and abuse detection**. Do not use browser inspection restrictions as an anti-cheat mechanism.

Developer Tools access never grants permission to bypass server validation, alter other players' data, or access credentials. Never put server secrets in client code or public bundles.

## Enforcement and regression coverage

- The global inspection deterrent was removed from `src/App.jsx` and `src/inspectionDeterrent.js` was deleted.
- `tests/browser-devtools-access.test.js` guards against reintroducing global inspection/shortcut/context-menu blockers.
- `e2e/browser-devtools-access.spec.js` verifies keyboard and context-menu events are not canceled across key website routes.
- Future changes to gameplay, PupEye, UI controls, analytics, or browser compatibility **must preserve this policy**.

Browser keyboard shortcuts and the browser's own UI are ultimately under browser and OS control; automated website tests verify the site's event handling, not native DevTools windows.
