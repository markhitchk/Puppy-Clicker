# Puppy Clicker: community, languages, policies and Rewards

Status: proposed design for owner review. No application or production database changes have been made.

## Intent and decisions

Improve the existing website at https://puppy-clicker.vercel.app with public chat, English and Spanish support, a leaderboard, a styled policy reader, and a Rewards page organized into sections. Keep the established Puppy Clicker appearance and current gameplay economy.

The owner clarified that chat is open to users, every message must be visible to staff in `/admin`, and moderation must be strict for an all-ages community. Staff-readable public chat replaces the original end-to-end encryption request. Do not describe this feature as end-to-end encrypted or promise that filtering guarantees safety.

This document covers all five requested website changes. Android packaging and updates to the separate Android repository are outside this request. Existing website/native gameplay integration must continue working.

## Current project evidence

Inspected `main` at commit `cc5acd29438943f4397c587a34b2affd68e6c179` and the Puppy Clicker DB schema metadata.

- `src/App.jsx` mounts the website and the React Native Web game. `/privacy` currently displays a separate website-activity privacy notice.
- The active Rewards implementation is `RewardsScreen` in `src/native/App.jsx`, rather than the older `src/app/Rewards.jsx`. It renders level, streak, goals, claimed rewards, activities, prestige and achievements in one stack.
- `api/admin.js` checks current database roles and bans on each request. `api/_lib/pupIdentity.js` supplies the authenticated Pup Account identity for website operations.
- `src/dbSchemaLayout.js` describes physical tables in grouped schemas, with compatibility views in `public`. New work must respect this layout.
- The inspected database has canonical `puppy_accounts.pup_accounts`, `puppy_game.pup_account_saves`, and `puppy_admin.pup_admin_actions` tables. Save payloads are JSONB. Do not expose them through the leaderboard.
- `src/native/web/preferences.js` persists browser preferences but has no language selector.
- `public/assets/legal/privacy-policy.md` and `terms-of-use.md` are the current website-served legal source files. The policy contains Android-specific historical descriptions. Rendering it does not establish that those descriptions cover new social features.

## Approaches

1. **Fully moderated public chat:** staff can read all submissions. Use HTTPS and verify the hosting/database storage-encryption configuration. This fits the owner's clarified choice.
2. **Moderated public chat plus encrypted private messages:** separates moderation and private messaging but introduces a second privacy model and reporting flow. Not selected after the owner's clarification.
3. **End-to-end encrypted chat only:** prevents routine staff access to all message bodies. Incompatible with the clarified requirement.

Build on the existing React, React Native Web, Vercel API and Supabase stack. Do not introduce a paid moderation provider or another hosting service.

## Public chat

### Access and interaction

- One shared community room at `/chat`, linked from website navigation and in-game desktop/mobile navigation.
- Every active, registered, signed-in Pup Account can read and submit. Membership, Discord connection, and paid status are not required. Signed-out visitors see the sign-in prompt; they cannot read message bodies or post anonymously.
- No private messaging, uploads, images, clickable links, or attachments in this release. Messages are plain text, at most 300 Unicode code points, with a server-side byte limit.
- Before first use, display short community rules and a clear notice that staff can read every submission. Store the accepted chat-rules version.
- A player's own submissions show their status: pending, published, rejected, or removed. Rejected messages are never visible in the public room.
- Initial default, proposed by the builder: **every submission requires manual staff approval before publication**, including messages that pass automatic screening. When staff are offline, submissions remain pending. The UI must explain this; never imply live staffing.
- Automated English/Spanish screening checks prohibited terms, common obfuscation, links/contact information, and repeated spam before a submission enters the review queue. Uncertain results remain pending; screening failure never publishes a message.
- Apply server-enforced initial limits of one submission per 5 seconds and 10 submissions per minute per account, plus a bounded pending queue. Shared account limits must be atomic across concurrent requests. Network-level abuse limits supplement account limits without treating a shared IP as one person.
- Reporting creates a staff review item without automatically deleting a message. Blocking another player hides that player's published messages for the blocker. Staff retain access.
- Account bans and suspensions block chat access. Chat-only mutes prevent posting while leaving read access available; expiry uses server time.

### Admin workflow

- Support `/admin` and `/admin/chat` as authenticated entry points into the existing administration portal; retain `/account/admin` and add `/account/admin/chat` as compatible routes.
- Show clean tabs for Pending, Published, Rejected/Removed, Reports, and Muted Players. Display message text, player identity, submission time, screening flags, and moderation history in readable cards/table rows rather than raw JSON.
- Authorized ADMIN and DEVELOPER roles can review all submitted message bodies, including rejected and removed messages. Ordinary accounts can never enumerate this history or read another account's pending messages.
- Actions: approve, reject, remove, restore through approval, resolve report, issue/revoke a chat mute, and open existing account sanctions. Reuse existing staff hierarchy rules for restrictions.
- Moderation requires a reason and records actor, target, time, previous state, new state, and reason. Use conditional transitions to reject conflicting decisions. A message must not publish unless its approval and audit record both commit.
- Staff-written messages also enter approval by default; no hidden filter or audit bypass.

### Storage and API

- Add private canonical relations in a `puppy_social` schema for messages, reports, blocks, mutes, chat-rules acceptance, and moderation history. These are proposed names; implementation may refine them consistently.
- Use same-origin server endpoints following the existing Pup Account identity checks. Restrict database/API privileges; use RLS as defense in depth. Browser clients cannot write moderation states, staff roles, sender IDs, or timestamps.
- Keep message bodies out of generic application logs, network telemetry, and error responses. Expose only published messages and the caller's own submission status through the player API.
- Use cursor pagination with bounded page sizes. Start with visible-tab polling every 5 seconds and slower polling for hidden tabs; authenticated responses use private/no-store caching. Avoid exposing a realtime channel that could leak unapproved bodies.
- Proposed retention: pending submissions expire after 24 hours with an “Expired before review” status for the sender; staff cannot approve an expired submission. Published/rejected/removed message bodies expire after 30 days from submission; unresolved report evidence remains for up to 90 days from the report, then expires even if unresolved. Retain body-free staff audit metadata for 180 days. Show these periods in the chat privacy notice. Implement and verify scheduled cleanup; do not merely document it.
- Verify actual transport and provider storage encryption before making encryption claims. The service and authorized staff can read stored chat bodies.

## English and Spanish

- Add shared keyed English and Spanish dictionaries and a React translation context. Avoid brittle DOM text replacement or changing internal game identifiers.
- Scope includes website navigation and pages, account/login/recovery flows, admin controls, chat, leaderboard, game tabs and screens, settings, rewards/goals, help text, accessibility labels, and common user-facing errors.
- Default to the saved language, then a supported browser language, then English. Add an English / Español selector in the site header and game settings. Update document language and locale-aware dates/numbers immediately. Persist the choice locally without changing a cloud gameplay save.
- Translate dynamic goals and achievements by stable IDs. Keep usernames, message bodies, puppy IDs, brand names, and player-written content unchanged. No automatic translation of chat messages.
- Render existing legal source text in its authored language. Translate the reader controls; do not silently machine-translate legal text or label it an approved Spanish policy. The reader states the document language when it differs from the UI language.
- Missing keys fall back to English. CI verifies dictionary key parity and interpolation placeholders.

## Leaderboard

- Add `/leaderboard` and a matching in-game entry. Default to all-time lifetime Treats, with XP and puppies-owned tabs. These metrics are the builder's proposed defaults.
- Participation is opt-in, initially off for all accounts (builder's proposed privacy default). Before joining, show exactly which profile fields and scores become public. Store this server-side as a profile preference; leaving removes the account from all rankings immediately. The leaderboard ranks participating eligible accounts only, says so in its introduction, and presents a join invitation/empty state when none have joined. Self-rank is available only while participating.
- Display rank, display name/username, sanitized avatar, and the selected score. Signed-in players can see their own rank even when outside the displayed top 100. Return explicit empty/error states.
- Read only validated canonical server progression through a dedicated projection/query, never local storage or client-submitted scores. During implementation, verify which canonical save fields are authoritative and their handling of staff gifts/imports; reject malformed or unverifiable values rather than guessing a score.
- Exclude developer accounts and explicitly marked test accounts, active account bans/suspensions, and ineligible/unverified records. Do not infer test-account status from a loose username substring. Add an explicit server-owned eligibility/exclusion mechanism if none exists.
- Re-evaluate exclusions on reads so bans/exclusions do not linger in a cached result. Rank ties share the same displayed rank; deterministic pagination uses an internal account identifier without exposing it.
- Return a public, minimal projection only. Never return save JSON, email, IP, Friend Code, session tokens, installations, or private moderation data. Explain clearly which profile information becomes public before enabling the leaderboard.
- No prizes, economy changes, or seasonal resets in this release.

## Policy reader

- Add `/legal/privacy` and `/legal/terms` using a shared safe Markdown reader with Puppy Clicker styling, a document switcher, table of contents, anchor links, authored/effective date when present, print control, and access to the raw Markdown source.
- Preserve `/privacy` and its website-activity disclosure. Link it to the full policy reader and ensure new navigation does not conceal that disclosure. Keep old raw asset URLs available.
- Desktop: readable content column plus sticky contents sidebar. Mobile: expandable contents panel. Keyboard navigation and focus must work.
- Disable raw HTML execution and unsafe link schemes. Do not use unsanitized `dangerouslySetInnerHTML` for Markdown or translations. Include loading, not-found, and fetch-error states.
- Preserve existing legal text while improving presentation. Prepare accurate chat/leaderboard data-practice additions for owner review before their launch. A styled viewer alone does not make new practices covered by an old policy.

## Rewards sections

Refactor the active `RewardsScreen`, preserving action handlers and calculations:

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
- Test report/block ownership, staff permission changes, expired mutes, contradictory moderation decisions, cleanup expiry, and Markdown/chat XSS payloads.
- Test leaderboard eligibility, score validation, ties, paging, self-rank, and exclusion changes. Verify responses contain only the allowed projection.
- Check English/Spanish dictionary coverage, interpolation, immediate language switching, storage failure fallback, accented input, locale formatting, and document language.
- Check Rewards in mobile and desktop layouts: all actions still reach their current handlers; claim locks, rewards, XP, timers and prestige remain unchanged.
- Check legal routes, existing links, accessible contents navigation, mobile overflow, source retrieval failures and print output.
- Run existing repository tests and production build, plus targeted behavior tests and browser checks. Verify live database changes with queries and security advisors. Deployment must expose real moderation-backed behavior rather than placeholder chat or fake rankings.
- Do not advertise chat as safe for every age, continuously staffed, or end-to-end encrypted. Explain prepublication approval and staff visibility plainly.
- Keep chat disabled until the moderation workflow, retention cleanup and accurate disclosures are verified. The other four features may deploy independently if chat checks are incomplete.

## Decisions left to implementation

Exact component boundaries, safe Markdown dependency choice, migration-generated filenames, schema object names, indexes, and test fixtures may be chosen by the builder. Use existing libraries where practical, pin added dependencies, and keep secrets server-side. This design introduces no paid service.

## Builder review

A fresh engineer reviewed this design for consequential gaps. The review identified pending-message retention and leaderboard participation as unspecified. Both are now resolved above as builder-proposed defaults: pending submissions expire after 24 hours; leaderboard participation requires opt-in. No additional owner decision is required to understand the proposed design; the owner may change those defaults during review.
