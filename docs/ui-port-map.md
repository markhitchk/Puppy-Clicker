# Website → Android shared UI port map

Source audited: `9a3d27ed6e41526d9d7594a548b8e2ed67036a71` (Puppy-Clicker/main).
Target audited: `4b6e2fc0fb35446d7fea6239672441ddd57238da` (pup-clinker/main, Mobile).

## Actual entry points and ownership

The live entry is src/main.jsx → src/App.jsx → src/native/App.jsx. The older src/app/UniversalApp.jsx is only used by website/mobile/App.jsx; it is **not the live visual spec**. Source UI ownership moves to shared-ui/. Mobile/shared-ui/ is generated, never hand-edited. Both shells render those same files. The two repositories retain their own engines and services.

Use a checked snapshot rather than a workspace dependency: these are separate repositories with separate React versions and lockfiles. A local workspace package spanning them would require a monorepo or network Git dependency during installation. An allowlisted sync, source commit and per-file SHA-256 receipts is the smallest arrangement that Metro and Vite both consume without new runtime dependencies. Sync is explicit and PR-only; ordinary builds consume pinned committed bytes and fail on drift.

## Inclusion and integration map

| Website source / surface | Category | Target / boundary | Blocker and fix |
| --- | --- | --- | --- |
| native/App.jsx:64–140 primitives, wallet, portraits | A/B assets | shared-ui primitives | Image resolution through one shared registry and shell asset adapter |
| native/App.jsx:141–233 Play/dashboard/goals | A/B actions | shared-ui Play | Replace DOM/CSS with RN primitives and explicit styles; inject selectors, clock, actions, alerts/haptics |
| native/App.jsx:236–272 Care | A/B actions | shared-ui Care | Keep engine care selectors and native action path |
| native/App.jsx:273–357 Shop/accessories/tickets/coins | A/B money | shared-ui Shop | Native offer selectors and purchase actions; redeem opens native entitlement path |
| native/App.jsx:358–399 Prestige | A/B money | shared-ui Prestige | Inject prestige/skills selectors and confirmation; native reducer writes |
| native/App.jsx:400–534 Roster/details | A/B device/network | shared-ui Roster | Registry supplied by each shell; image retry, rename/favorite actions; exchange is shell slot |
| native/App.jsx:690–778 Rewards/XP/achievements/park | A/B actions | shared-ui Rewards | Inject date/eligibility/preview selectors; gacha and casino named slots |
| native/App.jsx:537–688 Gacha | C | native retained Gacha / website retained Gacha | Keep art, reveals and action flow; shared route only renders slot |
| native/App.jsx:780–1026 Casino/Blackjack | C | native retained Casino / website retained Casino | Keep original casino modules, native RNG/transactions and art |
| native/web/WebSettings.jsx | A/B settings | shared-ui Settings | DOM controls become accessible RN controls; browser-only capabilities remain shell slots; add search from existing SettingsScreen |
| native/web/WebsiteDesign.jsx | A/B | shared-ui Play/progress/dialogs | Dialog/DOM/CSS converted; confirmation and secure-name helper adapter |
| native/web/DesktopNavigation.jsx | A/B | shared-ui shell | Width hook replaces media queries; native safe-area insets passed from host; web-only site links stay shell-owned |
| native/web/AccountGate.jsx + WebRegister.jsx + DiscordSignupForm.jsx | B | shared auth presentation; native BetaAccountEntry behavior | No web Supabase, HTTPS callback, browser history or recovery-email flow imported; retain native session and callbacks |
| native/src/production/AccountOnboarding.jsx | A/B | shared six-stage onboarding presentation | Inject setup state/update/next/back/review/finish, assets, notifications, links; no guest setup |
| native/src/components/NotificationInbox.jsx | A/B | shared inbox | Local read/unread/clear UI, native notification permissions and delivery remain native |
| InventoryScreen.jsx | A/B | shared inventory | Existing live equivalent: include UI and read-only display via selectors, no web network client |
| native/src/components/AccountDetailsScreen.jsx | A/B | shared account details | Verified account model only; clipboard, refresh and manage via adapters |
| native/src/theme.js + native/web/*.css | A | shared tokens | Canonical website dark palette, light palette from existing paletteFor, accent mapping #00B8F0 → #00E5FF, UI scaling/motion |
| src/mobile/engine/{balancedProgression,playV6}.js | B (existing rules source) | unchanged sync:mobile-engine | Preserve current rule sync; no third economy implementation |
| native/src/state/useGame.js | D | website adapter only | Contains server pup-web-auth intents/receipts/outbox; must never enter native bundle |
| Mobile/src/state/useGame.js + reducer + engine | B/C | native shell only | Existing signed authority, revisions, queue and saves kept; UI receives display model and act |
| Mobile/src/production + native modules | C | native shell only | Keystore, attestation, one-device/ban/startup authority remains native |
| api/, supabase/, middleware.js, Vercel/Vite/html/PWA/SEO | D | none | Website infrastructure stays website-owned |
| admin, email recovery/HTTPS callbacks, browser-only extras | D | none | No app imports; no redirect registration changes |
| public demo / HomePlayDemo / useDemoAccess / playDemoRoute | D | website shell only | Retain public demo outside shared UI |
| web owner-install gating and legacy casino block messages | D | native equivalents | No web-owner-install gating in shared screens |

## Visible differences this changes

Native currently has a distinct Kotlin-style Play and optional V2 layout, compact top header, different colors/radii, a differently styled wallet/next goal, no website yard dashboard, different roster controls/grid, separate native settings and native account form, and no shared inventory screen. Website uses a night-yard dashboard, cyan panels, large tap control, desktop rail at 960px, right resource/goals/care panels, richer roster search/sort/details and browser controls. The new layer must own these views in both shells; no claim of pixel identity is made until the screenshot matrix passes.

Phones use five tabs. At width >= 960 logical pixels use the rail; 768px tablet remains tabbed like the website. Safe-area belongs to the host. Device and browser capabilities are adapters or named extension slots. CSS-only hover/cursors are excluded. Gradients, blur, font fallback and emoji differences require screenshot/device checks and must be reported if divergent.

## App-only screens retained

ProductionEntry migration verification; PuppyStartupScreen/error boundary and crash recovery; PuppyQueueRoom; native identity recovery; device-transfer/ban/attestation flows; native policy document modal; native notification system settings; native diagnostics/error history/reporting; PuppyExchangeScreen (already exists in native, keep as named shell extension); V2PlayScreen is superseded duplicate UI, not a new slot. Casino and Gacha are mandatory C slots.

## Guest/demo inventory and disposition

| Location | Branch/key/copy | Disposition |
| --- | --- | --- |
| src/HomePlayDemo.jsx, homePlayDemoState.js, useDemoAccess.js, playDemoRoute.js; src/App.jsx demo route | Public demo and temporary access | D: keep outside shared |
| src/native/App.jsx:1027–1059 | Guest six-stage onboarding, guest profile fields, unsaved/local preview/privacy/ready copy | Remove from extracted shared code; shared signed-out gate only auth/onboarding |
| src/native/App.jsx:1067,1127–1196 | stale mode default and guest branch controller | Do not extract controller; website useGame is signed-only; native always beta authority |
| src/native/App.jsx:536; native casino component disclaimers | Local guest-only settlement comments/copy | C original slots preserved; no guest routing or guest copy enters shared files |
| src/native/src/state/guestSave.js | puppy-clicker:react-native:guest:v1 | D: no shared import |
| src/native/src/state/reducer.js / engine/progression.js | guestName, guestLevel internal legacy fields | Native/web model translation only; shared displayName field; no guest identity fallback |
| src/native/web/WebSettings.jsx | guestName fallback | Translate signed account display name at adapter boundary |
| src/native/src/components/{SettingsScreen,AccountDetailsScreen,NotificationInbox}.jsx | preview/local account fallbacks and labels | Strip from shared presentation; signed account required |
| src/app/UniversalApp.jsx, useAccount.js, Settings.jsx, Onboarding.jsx, preferences.js | older local/setupMethod LOCAL/guest inbox useAccount fallback | D: obsolete tree is not extracted |
| mobile/platform.js | puppy_ui_preferences, puppy_inbox_v1:<user-id or guest>, puppy_schedule_v1:<month> | D old host adapter; no shared implementation imports |
| Mobile/App.js guest OnboardingScreen and useGame mode default | Dormant guest entry/components | Remove duplicate UI and make shipped shared entry require verified session; engine compatibility tests may retain legacy save parser |
| shared-ui/ | isGuest/demo/guest sessions and profile/inbox keys | Must contain none; enforce with dependency and guest-path tests |

Existing live local state keys stay in web adapters only: puppy-clicker:web-preferences:v1; puppy-clicker:roster:read-only:v1; puppy-clicker-notification-ui:v1:<account-uuid>; IndexedDB puppy-clicker-gameplay-outbox/operations; OAuth puppy-web-discord-pkce-pending-v3 and session signup/return keys. Shared storage is an async interface. Native supplies AsyncStorage. The browser never submits balances, RNG or raw saves.

## Baseline verification and live capture

Native baseline: 306 tests passed. Website first concurrent baseline: 323 passed, one generated-share PNG read failure while install/build generation was still running; rerun sequentially. Live /play was opened read-only and shows protected account sign-in. No account credentials were supplied, so authenticated live capture is unavailable. Requested 360x800/768x800/1280x800 light/dark matrix remains a separate verification requirement; fixtures are test-only and cannot prove live account sync or native OAuth.

## Decision calls

1. The actual live src/native tree wins over the stale src/app parity document (rule 1).
2. Use a canonical source with generated allowlisted snapshots and checks, not handwritten copies (sharing option allowed in Step 2).
3. Date/goal/offer/XP selectors and transactions are injected rules, keeping each authority path (rules 2,6).
4. Inventory has a working website equivalent and is presentation; include it (rule 1).
5. Existing native Exchange, diagnostics, queue, crash/device/ban screens remain shell extensions styled by shared tokens (rules 2,4).
6. Keep five tabs; Casino is a named nested route and rail action, Gacha is a named Rewards route/section (rule 5).
7. Preview packaging discrepancy is explicit: current code defaults .beta while request requires .reactpreview. Reconcile preview identification without relaxing native isBeta checks or production release gate; preserve legacy callbacks, document requested redirects; do not change provider registrations.
8. Preserve app/web casino and gacha implementations as slot payloads; no shared casino economy or RNG (rule 5).
9. Browser capabilities (fullscreen, language/site links) stay in web-only extension slots (rule 3).

## File inventory

Every UI/component/hook/token/asset-registry/sync source path inspected is classified below. Engine/state implementations are shell adapters, not copied into shared presentation.

| Website path | Category | App counterpart / disposition |
| --- | --- | --- |
| `src/app/Casino.jsx` | D | No runtime port; actual live source used |
| `src/app/KotlinCareScreen.jsx` | D | No runtime port; actual live source used |
| `src/app/KotlinPlayScreen.jsx` | D | No runtime port; actual live source used |
| `src/app/Onboarding.jsx` | D | No runtime port; actual live source used |
| `src/app/PlayCare.jsx` | D | No runtime port; actual live source used |
| `src/app/Prestige.jsx` | D | No runtime port; actual live source used |
| `src/app/Rewards.jsx` | D | No runtime port; actual live source used |
| `src/app/Roster.jsx` | D | No runtime port; actual live source used |
| `src/app/Settings.jsx` | D | No runtime port; actual live source used |
| `src/app/Shop.jsx` | D | No runtime port; actual live source used |
| `src/app/UniversalApp.jsx` | D | No runtime port; actual live source used |
| `src/app/inbox.js` | D | No runtime port; actual live source used |
| `src/app/onboarding.js` | D | No runtime port; actual live source used |
| `src/app/preferences.js` | D | No runtime port; actual live source used |
| `src/app/ui.jsx` | D | No runtime port; actual live source used |
| `src/app/useAccount.js` | D | No runtime port; actual live source used |
| `src/native/App.jsx` | A/B | shared-ui presentation or shell adapter boundary |
| `src/native/SOURCE.json` | A/B | shared-ui presentation or shell adapter boundary |
| `src/native/assets/legal/documents.json` | A | One registry; shell assets |
| `src/native/src/assets/gacha.js` | C | Existing native casino/Gacha slot |
| `src/native/src/assets/puppies.js` | A | One registry; shell assets |
| `src/native/src/components/AccountDetailsScreen.jsx` | A/B | shared-ui presentation or shell adapter boundary |
| `src/native/src/components/DangerHoldDialog.jsx` | A/B | shared-ui presentation or shell adapter boundary |
| `src/native/src/components/LuckyWheelV6.jsx` | C | Existing native casino/Gacha slot |
| `src/native/src/components/NotificationInbox.jsx` | A/B | shared-ui presentation or shell adapter boundary |
| `src/native/src/components/PlinkoV6.jsx` | C | Existing native casino/Gacha slot |
| `src/native/src/components/PuppyDetailsDialog.jsx` | A/B | shared-ui presentation or shell adapter boundary |
| `src/native/src/components/PuppyExchangeScreen.jsx` | A/B | shared-ui presentation or shell adapter boundary |
| `src/native/src/components/PuppyPointer.jsx` | A/B | shared-ui presentation or shell adapter boundary |
| `src/native/src/components/RouletteV6.jsx` | C | Existing native casino/Gacha slot |
| `src/native/src/components/ScratchStage.jsx` | C | Existing native casino/Gacha slot |
| `src/native/src/components/ScratchersV6.jsx` | C | Existing native casino/Gacha slot |
| `src/native/src/components/SettingsScreen.jsx` | A/B | shared-ui presentation or shell adapter boundary |
| `src/native/src/components/SlotsV6.jsx` | C | Existing native casino/Gacha slot |
| `src/native/src/components/pupFriendCode.js` | A/B | shared-ui presentation or shell adapter boundary |
| `src/native/src/engine/attention.js` | B | Mobile/src/engine/attention.js through adapter |
| `src/native/src/engine/balancedProgression.js` | B | Mobile/src/engine/balancedProgression.js through adapter |
| `src/native/src/engine/blackjack.js` | B | Mobile/src/engine/blackjack.js through adapter |
| `src/native/src/engine/blackjackLayout.js` | B | Mobile/src/engine/blackjackLayout.js through adapter |
| `src/native/src/engine/blackjackV6.js` | B | Mobile/src/engine/blackjackV6.js through adapter |
| `src/native/src/engine/careDecay.js` | B | Mobile/src/engine/careDecay.js through adapter |
| `src/native/src/engine/careV6.js` | B | Mobile/src/engine/careV6.js through adapter |
| `src/native/src/engine/casinoTicketRewards.js` | B | Mobile/src/engine/casinoTicketRewards.js through adapter |
| `src/native/src/engine/casinoV7.js` | B | Mobile/src/engine/casinoV7.js through adapter |
| `src/native/src/engine/dynamicRoster.js` | B | Mobile/src/engine/dynamicRoster.js through adapter |
| `src/native/src/engine/gacha.js` | B | Mobile/src/engine/gacha.js through adapter |
| `src/native/src/engine/gachaV6.js` | B | Mobile/src/engine/gachaV6.js through adapter |
| `src/native/src/engine/game.js` | B | Mobile/src/engine/game.js through adapter |
| `src/native/src/engine/inbox.js` | B | Mobile/src/engine/inbox.js through adapter |
| `src/native/src/engine/monthlyRewards.js` | B | Mobile/src/engine/monthlyRewards.js through adapter |
| `src/native/src/engine/onboarding.js` | B | Mobile/src/engine/onboarding.js through adapter |
| `src/native/src/engine/playRevamp.js` | B | Mobile/src/engine/playRevamp.js through adapter |
| `src/native/src/engine/playV6.js` | B | Mobile/src/engine/playV6.js through adapter |
| `src/native/src/engine/plinkoV6.js` | B | Mobile/src/engine/plinkoV6.js through adapter |
| `src/native/src/engine/progression.js` | B | Mobile/src/engine/progression.js through adapter |
| `src/native/src/engine/rosterV6.js` | B | Mobile/src/engine/rosterV6.js through adapter |
| `src/native/src/engine/rouletteV6.js` | B | Mobile/src/engine/rouletteV6.js through adapter |
| `src/native/src/engine/scratch.js` | B | Mobile/src/engine/scratch.js through adapter |
| `src/native/src/engine/settings.js` | B | Mobile/src/engine/settings.js through adapter |
| `src/native/src/engine/shopV6.js` | B | Mobile/src/engine/shopV6.js through adapter |
| `src/native/src/engine/slotsV6.js` | B | Mobile/src/engine/slotsV6.js through adapter |
| `src/native/src/engine/wheelV6.js` | B | Mobile/src/engine/wheelV6.js through adapter |
| `src/native/src/production/AccountOnboarding.jsx` | C/B | Mobile/src/production/AccountOnboarding.jsx preserved native behavior |
| `src/native/src/production/BetaAccountEntry.jsx` | C/B | Mobile/src/production/BetaAccountEntry.jsx preserved native behavior |
| `src/native/src/production/ProductionEntry.jsx` | C/B | Mobile/src/production/ProductionEntry.jsx preserved native behavior |
| `src/native/src/production/PuppyErrorBoundary.jsx` | C/B | Mobile/src/production/PuppyErrorBoundary.jsx preserved native behavior |
| `src/native/src/production/PuppyQueueRoom.jsx` | C/B | Mobile/src/production/PuppyQueueRoom.jsx preserved native behavior |
| `src/native/src/production/PuppyStartupScreen.jsx` | C/B | Mobile/src/production/PuppyStartupScreen.jsx preserved native behavior |
| `src/native/src/production/authority.js` | C/B | Mobile/src/production/authority.js preserved native behavior |
| `src/native/src/production/kotlinCloudPreview.js` | C/B | Mobile/src/production/kotlinCloudPreview.js preserved native behavior |
| `src/native/src/production/queueModel.js` | C/B | Mobile/src/production/queueModel.js preserved native behavior |
| `src/native/src/production/startupErrors.js` | C/B | Mobile/src/production/startupErrors.js preserved native behavior |
| `src/native/src/production/startupGate.js` | C/B | Mobile/src/production/startupGate.js preserved native behavior |
| `src/native/src/production/useAccountOnboarding.js` | C/B | Mobile/src/production/useAccountOnboarding.js preserved native behavior |
| `src/native/src/state/gameplayOutbox.js` | B | Mobile/src/state/gameplayOutbox.js through adapter |
| `src/native/src/state/guestSave.js` | B | Mobile/src/state/guestSave.js through adapter |
| `src/native/src/state/notificationUiState.js` | B | Mobile/src/state/notificationUiState.js through adapter |
| `src/native/src/state/optimisticTaps.js` | B | Mobile/src/state/optimisticTaps.js through adapter |
| `src/native/src/state/reducer.js` | B | Mobile/src/state/reducer.js through adapter |
| `src/native/src/state/saveFeedback.js` | B | Mobile/src/state/saveFeedback.js through adapter |
| `src/native/src/state/systemNotifications.js` | B | Mobile/src/state/systemNotifications.js through adapter |
| `src/native/src/state/useGame.js` | B | Mobile/src/state/useGame.js through adapter |
| `src/native/src/state/useLocalDiagnostics.js` | B | Mobile/src/state/useLocalDiagnostics.js through adapter |
| `src/native/src/state/useNotifications.js` | B | Mobile/src/state/useNotifications.js through adapter |
| `src/native/src/state/useRoster.js` | B | Mobile/src/state/useRoster.js through adapter |
| `src/native/src/theme.js` | A/B | shared-ui presentation or shell adapter boundary |
| `src/native/web/AccountGate.jsx` | B | Shared presentation; web behavior excluded |
| `src/native/web/DesktopNavigation.jsx` | B | Shared presentation; web behavior excluded |
| `src/native/web/PuppyArtwork.jsx` | B | Shared presentation; web behavior excluded |
| `src/native/web/WebSettings.jsx` | B | Shared presentation; web behavior excluded |
| `src/native/web/WebsiteDesign.jsx` | B | Shared presentation; web behavior excluded |
| `src/native/web/cursors.css` | A (tokens only) | shared-ui tokens; CSS itself excluded |
| `src/native/web/desktop-reference.css` | A (tokens only) | shared-ui tokens; CSS itself excluded |
| `src/native/web/exchangeClient.js` | B | Shared presentation; web behavior excluded |
| `src/native/web/kawaii.css` | A (tokens only) | shared-ui tokens; CSS itself excluded |
| `src/native/web/portraitManifest.json` | B | Shared presentation; web behavior excluded |
| `src/native/web/preferences.js` | B | Shared presentation; web behavior excluded |
| `src/native/web/puppyOAuth.js` | B | Shared presentation; web behavior excluded |
| `src/native/web/recoveryCallback.js` | B | Shared presentation; web behavior excluded |
| `src/native/web/rosterLoader.js` | B | Shared presentation; web behavior excluded |
| `src/native/web/webGoalState.js` | B | Shared presentation; web behavior excluded |
| `src/native/web/website.css` | A (tokens only) | shared-ui tokens; CSS itself excluded |
| `src/native/webCompat.js` | A/B | shared-ui presentation or shell adapter boundary |
| `src/native/webSafeArea.jsx` | A/B | shared-ui presentation or shell adapter boundary |
| `src/native/webStorage.js` | A/B | shared-ui presentation or shell adapter boundary |
| `src/mobile/engine/SOURCE.json` | B | Mobile/src/mobile/engine/SOURCE.json through adapter |
| `src/mobile/engine/balancedProgression.js` | B | Mobile/src/mobile/engine/balancedProgression.js through adapter |
| `src/mobile/engine/playV6.js` | B | Mobile/src/mobile/engine/playV6.js through adapter |
| `mobile/App.jsx` | D | No runtime port; actual live source used |
| `mobile/app.config.cjs` | D | No runtime port; actual live source used |
| `mobile/app.json` | D | No runtime port; actual live source used |
| `mobile/assets.js` | D | No runtime port; actual live source used |
| `mobile/eas.json` | D | No runtime port; actual live source used |
| `mobile/index.js` | D | No runtime port; actual live source used |
| `mobile/metro.config.cjs` | D | No runtime port; actual live source used |
| `mobile/package-lock.json` | D | No runtime port; actual live source used |
| `mobile/package.json` | D | No runtime port; actual live source used |
| `mobile/platform.js` | D | No runtime port; actual live source used |
| `mobile/transparent-assets.js` | D | No runtime port; actual live source used |
| `scripts/build-share-previews.mjs` | A/B | Existing engine/art sync plus explicit UI sync |
| `scripts/prepare-puppy-art.mjs` | A/B | Existing engine/art sync plus explicit UI sync |
| `scripts/prepare-web-portraits.mjs` | A/B | Existing engine/art sync plus explicit UI sync |
| `scripts/sync-assets.mjs` | A/B | Existing engine/art sync plus explicit UI sync |
| `scripts/sync-mobile-engine.mjs` | A/B | Existing engine/art sync plus explicit UI sync |
| `scripts/sync-puppy-pointers.mjs` | A/B | Existing engine/art sync plus explicit UI sync |
| `docs/parity/2026-10-23-parity-audit.md` | A/B | shared-ui presentation or shell adapter boundary |
| `docs/parity/asset-manifest.json` | A/B | shared-ui presentation or shell adapter boundary |
