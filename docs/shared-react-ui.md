# Puppy Clicker shared React UI

The **website repository is the source of truth** for React Native-compatible UI used on the website and the Android beta. This is genuine shared component source, not a screenshot, WebView, or separately implemented lookalike.

## Where to change UI

- `src/shared-ui/PupGameChrome.jsx` — wallet/resource strip, care meter, quick-action controls, colors and shared glass tokens. The web game's `src/native/App.jsx` imports these components directly.
- `src/shared/usePupAuthForm.js` — cross-platform login and registration form state, password rules, consent and optional discovery-source choices.
- Put **new cross-platform React Native UI components under `src/shared-ui/`**. Keep them browser-independent and render only primitives from `react-native` (`View`, `Text`, `Pressable`, etc.), which work through React Native Web in the website and React Native on Android.

Android keeps a verified, checked-in copy under `pup-clinker/Mobile/src/shared-ui/` and `Mobile/src/shared/`. The Android repository runs `Mobile/scripts/sync-website-ui.mjs` against the website's latest **main** commit every six hours, checks parity/tests, and opens a reviewable sync PR. After that PR is merged, the next Android APK build contains those UI changes. Source hashes are recorded in `Mobile/src/shared-ui/SOURCE.json` and checked offline.

## Boundaries

**Not every existing website file is portable to React Native.** DOM/HTML, CSS selectors, dialogs, browser routing, and Vercel-only modules must be refactored into shared RN components before Android can use them. Until then, those website-only views will not automatically appear in the APK.

Authentication, Supabase sessions, PupEye device signatures, queue admission, secure credentials, system notifications, platform permissions, and gameplay writes remain in platform-specific adapters. Shared presentational components receive data and action handlers as props. Do not import browser Supabase clients or private server keys into shared UI.

### Change workflow

1. Implement or update the UI in `src/shared-ui/`; use it from the website itself.
2. Run website tests/build and merge the website PR to `main`.
3. The Android sync workflow proposes **identical source** as a GitHub PR (or run it manually); it does not silently overwrite the game.
4. Review Android layout/QA, run CI, merge the sync PR and build the Android beta APK.

To manually inspect a synced Android tree, run `node Mobile/scripts/sync-website-ui.mjs --verify` from the Android repository root. To refresh from the website, run `node Mobile/scripts/sync-website-ui.mjs` (Node 22+ and network connectivity required).
