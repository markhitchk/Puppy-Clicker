# Puppy Clicker: community, languages, policies and Rewards

Status: proposed design for owner review. No application or production database changes have been made.

## Intent and decisions

Improve Puppy Clicker on Android, the website at https://puppy-clicker.vercel.app, and its browser gameplay/web app with server-based group chat, English and Spanish support, a leaderboard, a styled policy reader, and a Rewards page organized into sections. Use a shared React Native + React Native Web codebase and a common backend. Keep the established Puppy Clicker appearance and current gameplay economy.

The owner clarified that chat is open to users, every message must be visible to staff in `/admin`, and moderation must be strict for an all-ages community. Staff-readable public chat replaces the original end-to-end encryption request. Do not describe this feature as end-to-end encrypted or promise that filtering guarantees safety.

PupEye must provide shared server-side chat screening for inappropriate language and sexual remarks, with staff visibility and review. This requirement does not by itself approve automatic publication of messages that pass screening.

The owner expanded the request to include the Android app and asked for “one size fits all” coding. This revision covers all five features on Android and web, shared source organization, and Android beta verification. It supersedes the prior website-only scope and single-room chat assumption. Existing saves, account identity, native services and released-client API contracts must continue working.

## Current project evidence

Inspected `markhitchk/Puppy-Clicker` main at `cc5acd29438943f4397c587a34b2affd68e6c179`, `markhitchk/pup-clinker` main at `dc08d683a669d2b017f62e7f2ca8d77c42ea1aa4`, and the Puppy Clicker DB schema metadata.

- `src/App.jsx` mounts the website and the React Native Web game. `/privacy` currently displays a separate website-activity privacy notice.
- The active Rewards implementation is `RewardsScreen` in `src/native/App.jsx`, rather than the older `src/app/Rewards.jsx`. It renders level, streak, goals, claimed rewards, activities, prestige and achievements in one stack.
- `api/admin.js` checks current database roles and bans on each request. `api/_lib/pupIdentity.js` supplies the authenticated Pup Account identity for website operations.
- `src/dbSchemaLayout.js` describes physical tables in grouped schemas, with compatibility views in `public`. New work must respect this layout.
- The inspected database has canonical `puppy_accounts.pup_accounts`, `puppy_game.pup_account_saves`, and `puppy_admin.pup_admin_actions` tables. Save payloads are JSONB. Do not expose them through the leaderboard.
- `src/native/web/preferences.js` persists browser preferences but has no language selector.
- `public/assets/legal/privacy-policy.md` and `terms-of-use.md` are the current website-served legal source files. The policy contains Android-specific historical descriptions. Rendering it does not establish that those descriptions cover new social features.

- Production Android source is `pup-clinker/Mobile`; its index preserves queue-before-startup and its build configuration isolates `com.harleytg.puppyclicker.beta`.
- The website's `src/native/SOURCE.json` records a copied Android snapshot at `f35ad86ea874671bc05a3ab3dedde5bf97bbc06b`. The active website app also contains browser-only imports and DOM-based desktop screens, so pointing Android at that file is insufficient.
- The scheduled website sync copies only `balancedProgression.js` and `playV6.js`. It does not provide one common UI or complete engine.
- The website repository also has `mobile/App.jsx` and an older `src/app/UniversalApp.jsx`. They do not mount the current website game or replace production Android, so that starter is not the migration target.

## Approaches

1. **Fully moderated public chat:** staff can read all submissions. Use HTTPS and verify the hosting/database storage-encryption configuration. This fits the owner's clarified choice.
2. **Moderated public chat plus encrypted private messages:** separates moderation and private messaging but introduces a second privacy model and reporting flow. Not selected after the owner's clarification.
3. **End-to-end encrypted chat only:** prevents routine staff access to all message bodies. Incompatible with the clarified requirement.

Build on the existing React, React Native Web and Supabase stack. Retain Vercel for the website. Do not introduce a paid moderation provider or another hosting service.

## One shared codebase across Android and web

### Repository and build structure

The recommended approach is a single workspace repository with separate thin launchers and shared packages. The proposed canonical repository is `markhitchk/pup-clinker`, preserving its established production Android code and build/signing integrations. Repository placement is a builder recommendation, not a prior owner decision. Preserve the public website URL and current Vercel project.

- `Mobile/`: existing Expo Android launcher, native modules/plugins and Android build configuration.
- `Web/`: website launcher, routes, public landing/account/admin shell, browser-specific desktop presentation and Vercel deployment configuration.
- `packages/game-core/`: engine, state transitions, progression rules and validated shared models.
- `packages/game-ui/`: shared React Native screens/components, including chat, leaderboard, Rewards sections and policy reader structure. React Native Web renders the same components in browsers.
- `packages/services/`: shared API contracts, error codes, pagination and feature clients with injected authentication/transport.
- `packages/i18n/`: English/Spanish dictionaries, formatting and translation hooks.
- `packages/design/`: shared theme tokens, spacing, breakpoints and assets/catalog metadata.
- `supabase/`: one canonical, reviewed set of Puppy Clicker migrations, Edge Functions and server authorization/moderation logic.

A single responsive feature implementation must support narrow phones, tablets, desktop browsers and Android large-window/DeX/Chromebook layouts. Layout responds to available window dimensions, not an “Android means phone” test. Share design tokens and layout rules; CSS cannot be imported as Android native styling.

Keep small `.native`/`.web` adapters for secure/session storage, notifications, haptics, sound, safe areas, file operations, browser routes/deep links, document printing and native PupEye authentication. Do not force DOM elements, window/localStorage, service-worker code, browser auth adapters, or device keys into shared components. Platform-specific layouts may compose the same feature components rather than duplicating their business logic.

### Migration and release behavior

Extract shared modules from the actual production Android implementation and compare current web-specific fixes before replacing either copy. Preserve Android's native services, account verification, queue/startup order, save revision rules and signed gameplay operations. Resolve existing behavioral differences deliberately; do not revert web fixes by copying an old snapshot or switch Android to the older universal starter.

Move the website into the workspace on an isolated branch and prove the existing routes/game/admin on a preview before changing the production Vercel Git source/root. Keep the existing `Puppy-Clicker` repository serving production until the new source is verified; then switch the existing deployment project to the canonical workspace while retaining its hostname and environment configuration. Retire the two-file copying workflow only after both targets consume shared packages. No deleting either repository, rewriting history, deleting the historical Kotlin archive, or changing production Android signing/package identity is implied.

Use one compatible React version and a locked dependency graph supported by both web and Expo. Configure Metro and Vite workspace resolution so each app loads one React runtime. CI must run shared tests, web build/browser checks, Android bundle/build checks, and produce a downloadable standalone beta APK from the same source commit. Keep production Play release separate from beta validation.

### Shared backend and identity

Use one Supabase-backed feature service for Android and web. Shared feature code talks to the same message/channel/moderation and leaderboard contracts. Prefer common Edge Functions rather than making Android depend on a browser-origin-only Vercel route.

Keep platform authentication differences in trusted server adapters: web verifies its Supabase session and Pup Account link; Android verifies its existing signed PupEye/native account credential path. Both resolve a canonical Pup Account identity server-side before running common authorization logic. Never accept an account ID, role or device-verification claim merely because a client supplied it, and never remove native signing/attestation requirements to make clients look identical. Re-read authoritative bans, memberships and staff roles for privileged operations. Website `/admin` can call the same moderation service without shipping staff capabilities to ordinary app users.

## Public chat

### Access and interaction

- Server-style group messaging at `/chat` and in the Android app: a server/group contains named text channels with shared message history. Both platforms see the same server, channels, membership, published messages and moderation outcomes.
- Start with an official Puppy Clicker community server and proposed channels `#general`, `#espanol`, `#help`, and staff-posted `#announcements`. Keep the initial choices small and renameable by staff. Data/API models support multiple servers, channels and memberships.
- Proposed initial creation policy: only global ADMIN/DEVELOPER staff create/manage servers and channels. Ordinary active Pup Account users can join the official community and participate in writable channels. **Owner choice still open:** whether ordinary players may also create servers. Do not silently implement player-created communities or user-assigned moderators before this is resolved.
- Official channel visibility is shared by active community members; membership and channel access are enforced server-side. Enforce read-only announcements on both platforms and on the server. Archived/disabled channels cannot accept new messages. Every request/subscription binds to an authorized server/channel, not an arbitrary client-supplied room ID.
- Every active, registered, signed-in Pup Account can read and submit. Membership, Discord connection, and paid status are not required. Signed-out visitors see the sign-in prompt; they cannot read message bodies or post anonymously.
- No private messaging, uploads, images, clickable links, or attachments in this release. Messages are plain text, at most 300 Unicode code points, with a server-side byte limit.
- Before first use, display short community rules and a clear notice that staff can read every submission. Store the accepted chat-rules version.
- A player's own submissions show their status: pending, published, rejected, or removed. Rejected messages are never visible in the public room.
- Initial default, proposed by the builder: **every submission requires manual staff approval before publication**, including messages that pass automatic screening. When staff are offline, submissions remain pending. The UI must explain this; never imply live staffing.
- Automated English/Spanish screening checks prohibited terms, common obfuscation, links/contact information, and repeated spam before a submission enters the review queue. Uncertain results remain pending; screening failure never publishes a message.
- Apply server-enforced initial limits of one submission per 5 seconds and 10 submissions per minute per account, plus a bounded pending queue. Shared account limits must be atomic across concurrent requests. Network-level abuse limits supplement account limits without treating a shared IP as one person.
- Reporting creates a staff review item without automatically deleting a message. Blocking another player hides that player's published messages for the blocker. Staff retain access.
- Account bans and suspensions block chat access. Chat-only mutes prevent posting while leaving read access available; expiry uses server time.

### PupEye chat screening

The owner specifically requires PupEye to monitor chat for bad words, sexual remarks and other inappropriate language. This screening is mandatory for every server/channel and every client; changing the app language does not change enforcement.

- Run screening in the shared trusted backend before a message can be published or broadcast. Android and web may show immediate input guidance, but client checks never authorize publication. Staff submissions use the same screening path.
- Cover profanity and obscene language; sexual remarks, sexual solicitation and grooming indicators; harassment, bullying and personal attacks; hate speech and discriminatory slurs; threats and encouragement of violence or self-harm; attempts to collect personal/contact information; scams, malicious links, spam and flooding. These are moderation categories, not a claim that every harmful message can be detected automatically.
- Start with English and Spanish rules, including mixed-language input. Treat unsupported-language or uncertain results as needing review rather than declaring a language itself prohibited. Use Unicode normalization, token/word boundaries and bounded checks for common evasion patterns; preserve the original submission in restricted evidence under the existing retention rules. Do not expose detailed matching rules to ordinary users.
- Evaluate meaning/context where supported, including quoted/reporting language and innocent words that contain a prohibited substring. Simple word lists alone cannot reliably identify sexual solicitation, grooming or threats. Until contextual coverage is validated, retain the proposed manual prepublication approval for every message. Do not describe keyword matching as AI or complete contextual monitoring, and do not silently add a paid classifier.
- Store a versioned decision with the message: screening status, category/reason codes, rule version and review priority. Distinguish an actual detection from a screening error. Uncertain or flagged submissions are held outside public history for staff review; clearly prohibited submissions can be rejected with a short player-facing reason and a review path. A timeout, unavailable screening dependency, unknown decision or malformed response must never publish a message.
- Show held/rejected submissions and screening categories in the global admin chat view with server/channel, sender, platform, timestamp and bounded conversation context. All message history remains readable only within the previously defined player/staff access rules; context lookup cannot bypass channel authorization.
- A staff override must record its reason and the screening decision it overrides. Keep the original decision and action audit trail so overrides do not erase evidence. Ordinary users cannot override, clear flags or send a direct database write that bypasses PupEye.
- Give players a clear “PupEye held this message for review” or appropriate generic rejection notice, with no raw rule patterns, scores or backend details. In-app/system notifications about flagged messages must not copy unsafe message bodies into public toasts, push notifications or generic logs.
- Track repeated violations and provide staff with warnings/mute/restriction controls. Automatic permanent bans, account deletion, and device bans are not a consequence of a single heuristic match; keep serious sanctions in the existing authorized staff workflow.
- Keep user reporting and moderator review available for content that screening misses. Check any future edited-message feature before it can replace a published message; edits must not become a moderation bypass. No message-edit feature is added by this requirement.
- Test both languages, mixed/unsupported language, benign substring collisions, obfuscation, category flags, staff submissions, client/database bypass attempts, screening failures, cross-platform consistency and audit/retention behavior. Use bounded synthetic fixtures and verify flagged or failed-screening text never reaches public message responses.

### Admin workflow

- Support `/admin` and `/admin/chat` as authenticated entry points into the existing administration portal; retain `/account/admin` and add `/account/admin/chat` as compatible routes.
- Show server/channel filters and clean tabs for Pending, Published, Rejected/Removed, Reports, and Muted Players. Display message text, player identity, submission time, screening flags, and moderation history in readable cards/table rows rather than raw JSON.
- Authorized global ADMIN and DEVELOPER roles can review all submitted message bodies from both platforms and every server/channel, including rejected and removed messages. Any future community/room owner role must not be confused with a global admin role. Ordinary accounts can never enumerate this history or read another account's pending messages.
- Actions: approve, reject, remove, restore through approval, resolve report, issue/revoke a chat mute, and open existing account sanctions. Reuse existing staff hierarchy rules for restrictions.
- Moderation requires a reason and records actor, target, time, previous state, new state, and reason. Use conditional transitions to reject conflicting decisions. A message must not publish unless its approval and audit record both commit.
- Staff-written messages also enter approval by default; no hidden filter or audit bypass.

### Storage and API

- Add private canonical relations in a `puppy_social` schema for servers, channels, memberships, messages, reports, blocks, mutes, chat-rules acceptance, and moderation history. Every message belongs to an authorized server/channel and canonical sender. These are proposed names; implementation may refine them consistently.
- Use the shared authenticated service described above, with thin web/native transport adapters. Restrict database/API privileges; use RLS as defense in depth. Clients cannot write moderation states, staff roles, sender IDs, membership privileges, or timestamps.
- Keep message bodies out of generic application logs, network telemetry, and error responses. Expose only published messages and the caller's own submission status through the player API.
- Use cursor pagination with bounded page sizes. Shared hooks poll every 5 seconds only while the chat screen is active and connected; pause on browser-hidden/native-background states and refresh on resume. Authenticated responses use private/no-store caching. Reconnect with cursors and idempotency keys; show pending/offline/error states and never show a failed send as delivered. Do not silently queue outgoing messages after logout or an account change. Avoid exposing a realtime channel that could leak unapproved bodies.
- Proposed retention: pending submissions expire after 24 hours with an “Expired before review” status for the sender; staff cannot approve an expired submission. Published/rejected/removed message bodies expire after 30 days from submission; unresolved report evidence remains for up to 90 days from the report, then expires even if unresolved. Retain body-free staff audit metadata for 180 days. Show these periods in the chat privacy notice. Implement and verify scheduled cleanup; do not merely document it.
- Verify actual transport and provider storage encryption before making encryption claims. The service and authorized staff can read stored chat bodies.

## English and Spanish

- Add one shared set of keyed English and Spanish dictionaries and a React translation context, consumed directly by Android and web. Avoid brittle DOM text replacement or changing internal game identifiers.
- Scope includes website navigation and pages, account/login/recovery flows, admin controls, chat, leaderboard, game tabs and screens, settings, rewards/goals, help text, accessibility labels, and common user-facing errors.
- Default to the saved language, then a supported device/browser language, then English. Add an English / Español selector in the site header and shared game settings. Update web document language and shared locale-aware dates/numbers immediately. Persist the choice through each platform's preference adapter without changing a cloud gameplay save.
- Translate dynamic goals and achievements by stable IDs. Keep usernames, message bodies, puppy IDs, brand names, and player-written content unchanged. No automatic translation of chat messages.
- Render existing legal source text in its authored language. Translate the reader controls; do not silently machine-translate legal text or label it an approved Spanish policy. The reader states the document language when it differs from the UI language.
- Missing keys fall back to English. CI verifies dictionary key parity and interpolation placeholders.

## Leaderboard

- Add `/leaderboard` and the same shared leaderboard screen in the Android app and web game. Default to all-time lifetime Treats, with XP and puppies-owned tabs. These metrics are the builder's proposed defaults.
- Participation is opt-in, initially off for all accounts (builder's proposed privacy default). Before joining, show exactly which profile fields and scores become public. Store this server-side as a profile preference; leaving removes the account from all rankings immediately. The leaderboard ranks participating eligible accounts only, says so in its introduction, and presents a join invitation/empty state when none have joined. Self-rank is available only while participating.
- Display rank, display name/username, sanitized avatar, and the selected score. Signed-in players can see their own rank even when outside the displayed top 100. Return explicit empty/error states.
- Read only validated canonical server progression through a dedicated projection/query, never local storage or client-submitted scores. During implementation, verify which canonical save fields are authoritative and their handling of staff gifts/imports; reject malformed or unverifiable values rather than guessing a score.
- Exclude developer accounts and explicitly marked test accounts, active account bans/suspensions, and ineligible/unverified records. Do not infer test-account status from a loose username substring. Add an explicit server-owned eligibility/exclusion mechanism if none exists.
- Re-evaluate exclusions on reads so bans/exclusions do not linger in a cached result. Rank ties share the same displayed rank; deterministic pagination uses an internal account identifier without exposing it.
- Return a public, minimal projection only. Never return save JSON, email, IP, Friend Code, session tokens, installations, or private moderation data. Explain clearly which profile information becomes public before enabling the leaderboard.
- No prizes, economy changes, or seasonal resets in this release.

## Policy reader

- Add `/legal/privacy` and `/legal/terms` plus Android in-app policy navigation using one safe Markdown content/model pipeline with Puppy Clicker styling, a document switcher, table of contents, section links, authored/effective date when present, and access to the raw Markdown source. Use a platform rendering adapter where needed; printing is a web capability. Share the legal document versions and content source.
- Preserve `/privacy` and its website-activity disclosure. Link it to the full policy reader and ensure new navigation does not conceal that disclosure. Keep old raw asset URLs available.
- Desktop: readable content column plus sticky contents sidebar. Mobile: expandable contents panel. Keyboard navigation and focus must work.
- Disable raw HTML execution and unsafe link schemes. Do not use unsanitized `dangerouslySetInnerHTML` for Markdown or translations. Include loading, not-found, and fetch-error states.
- Preserve existing legal text while improving presentation. Prepare accurate chat/leaderboard data-practice additions for owner review before their launch. A styled viewer alone does not make new practices covered by an old policy.

## Rewards sections

Extract the active production Android Rewards implementation and reconcile the website `RewardsScreen` into one shared screen, preserving action handlers and calculations through the common game contract:

1. **Overview:** level, XP progress, daily streak and its existing limits.
2. **Daily rewards:** daily gift, today's goals, clear progress bars and ready-to-claim states.
3. **Adventures and games:** Dog Park, Gacha, and Casino in compact cards.
4. **Progression:** Prestige and skill points.
5. **Achievements:** awarded/total summary, unfinished achievements visible, completed achievements expandable.
6. **Claimed today:** collapsed by default, listing collected rewards once.

Use desktop section cards and mobile accordions with accessible expanded states. Keep Daily rewards open by default. Respect reduced motion, existing theme preferences, and touch targets. Remove implementation-oriented copy such as “signed XP” from player-facing summaries, while retaining the actual XP values and all verification behavior.

## Verification and launch

- Confirm current repository instructions and schema dependencies before implementation. Keep changes isolated on a feature branch and avoid unrelated repositories/tables.
- Test chat as anonymous, ordinary user, muted user, banned user, and staff. Verify that pending/rejected/removed messages never leak publicly, identity cannot be forged, concurrency cannot bypass limits, duplicate submissions do not duplicate messages, and failed screening/audit/approval operations fail closed.
- Test report/block ownership, staff permission changes, expired mutes, contradictory moderation decisions, cleanup expiry, and Markdown/chat XSS payloads. Test cross-server/channel ID tampering, membership changes, read-only channels and unapproved-message leakage.
- Verify an Android submission and website submission appear in the same admin queue, publish exactly once after approval and display on both clients. A removal/mute/ban from `/admin` must take effect on both clients. Test reconnect/background/resume and expired credentials independently.
- Verify the workspace uses one source module for each shared feature and that web bundling cannot include native secrets/modules or fail from imports of unavailable native APIs. Test phone, tablet, desktop browser and Android large-window layouts.
- Test leaderboard eligibility, score validation, ties, paging, self-rank, and exclusion changes. Verify responses contain only the allowed projection.
- Check English/Spanish dictionary coverage, interpolation, immediate language switching, native/browser storage failure fallback, accented input, locale formatting, and web document language. Exercise the actual shared components in both builds.
- Check Rewards in mobile and desktop layouts: all actions still reach their current handlers; claim locks, rewards, XP, timers and prestige remain unchanged.
- Check legal routes, existing links, accessible contents navigation, mobile overflow, source retrieval failures and print output.
- Run the relevant existing tests from both repositories, shared feature tests, the web production build/browser checks, and Android Expo export/native beta build and launch checks. Publish a downloadable beta APK when those checks succeed; do not claim an APK exists before an artifact is verified. Verify live database changes with queries and security advisors. Deployment must expose real moderation-backed behavior rather than placeholder chat or fake rankings.
- Do not advertise chat as safe for every age, continuously staffed, or end-to-end encrypted. Explain prepublication approval and staff visibility plainly.
- Keep chat disabled until the moderation workflow, retention cleanup and accurate disclosures are verified. The other four features may deploy independently if chat checks are incomplete.

## Decisions left to implementation

Exact component boundaries, safe Markdown dependency choice, migration-generated filenames, schema object names, indexes, and test fixtures may be chosen by the builder. Use existing libraries where practical, pin added dependencies, and keep secrets server-side. This design introduces no paid service.

## Builder review

A fresh engineer reviewed the cross-platform/server-channel revision. Two consequential owner choices remain: whether ordinary players may create servers, and whether every message (including staff messages) requires manual prepublication approval or automatic screening publishes acceptable messages while holding flagged submissions for staff. The current draft uses staff-created servers and manual approval of every message as proposed defaults, not separately confirmed owner instructions. The owner subsequently confirmed PupEye screening for bad words, sexual remarks and other inappropriate content; that requirement is specified above and does not resolve the remaining server-creation/publication choices. Other architectural and implementation details have explicit defaults or are delegated to the builder. The prior review resolved pending-message retention and leaderboard participation as builder-proposed defaults: pending submissions expire after 24 hours; leaderboard participation requires opt-in.
