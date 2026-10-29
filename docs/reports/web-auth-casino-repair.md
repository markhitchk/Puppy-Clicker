# Puppy Clicker web authentication and casino/gacha repair

## 1. Executive summary

Web-only changes prepared against `main` commit `696ff56671f1d97ca9b0730dc2825287e8b14027`.

Fixed one-use callback re-entry, premature session checks, hidden gameplay failures, duplicate casino/gacha submissions, and unsafe exposure of legacy casino deck data. Authentication, PupEye ownership, legal consent, server RNG and revision compare-and-set remain enforced. No Android source, Android build configuration, shared server economy reducer, database row or production deployment was changed.

Validation: **119 unit/integration tests and 50 browser tests passed; Vite production build passed.** Live third-party human verification was not automated. An outstanding legacy Android wager remains deliberately intact and must be completed through its original supported flow before new web casino wagers can start.

## 2. Root cause analysis for Issue 1: authentication loop

The browser's actual route is `src/App.jsx` → `src/native/web/AccountGate.jsx` → `src/native/web/puppyOAuth.js` → Supabase `pup-web-auth`. There is no application auth middleware or session-cookie implementation. `vercel.json` serves the SPA at the callback route. `src/supabase.js` uses persistent browser storage and explicitly disables automatic URL session detection because Discord codes are not Supabase Auth codes.

Reproduced defects:

- `puppyOAuth.js` consumed local PKCE state and scrubbed the callback URL to `/play` before exchanging the one-use Discord code. React Strict Mode re-entry could consume that state again, while the first exchange was pending. This is directly reproducible in development; it is not proof that Strict Mode caused the reported production challenge.
- `AccountGate.jsx` continued ordinary session checks after callback failures, replacing the specific error with a generic sign-in surface. Auth events could race callback installation. Users had no stable failure page explaining the next step.
- `src/RecoveryPage.jsx` scrubbed an email PKCE code and read the current session before its exchange completed. Re-entry could miss the outstanding exchange. Email links with provider errors were not handled consistently.
- The session client honored `VITE_SUPABASE_*`, but the public Discord/password exchange used hardcoded project credentials. Alternate deployment configuration could exchange into one project and install/verify the session in another.

The fixes share each one-use callback attempt, await exchange before session verification, preserve a clean error route, and navigate only after the linked Pup Account verifies. Email and Discord codes retain separate handlers. PKCE state and expiry checks remain active. SameSite/Secure cookie changes are not applicable to this storage-based SPA.

The repository has no CAPTCHA widget or challenge-token forwarding. The reported human challenge may be hosted by Discord or configured outside this repository; its exact production cause is **not established**. A live failure still requires the failing page origin, timestamp and sanitized request status/error code. Never include passwords, tokens, OAuth codes, verifiers or raw saves in that trace.

## 3. Root cause analysis for Issue 2: casino/gacha

Read-only production inspection found an unfinished legacy Android Blackjack round in `casino_active_round_v1`, state `WAGER_ACCEPTED`. Both `beta-economy.ts` and `beta-blackjack.ts` correctly refuse new rounds while that field is populated. The website projected only `beta_casino_round_v1`, so it displayed no pending round and offered controls that could only fail.

`crossPlay.ts` collapsed rule failures into `PUP_GAMEPLAY_REJECTED`. `useGame.js` recorded failures in a status displayed mainly in Settings. This made rejected transactions appear unresponsive. In addition, repeated clicks before a receipt arrived could enqueue multiple paid pulls/round actions. Gacha animation depended on the entire projected result object, so a fresh snapshot of the same receipt could restart its reveal.

The legacy field also contained a serialized remaining deck. `publicCloudSnapshot` previously returned it to the browser. It is now removed from the response; the browser receives only a boolean pending-round hint. The authoritative field is preserved, with no refund, deletion, new deck, or browser settlement.

The deployed `pup-web-auth` and all its bundled server files matched the repository before edits. Missing server implementation and stale deployed reducers were ruled out for this snapshot. Real reducer tests confirm:

- Slots, Roulette, Plinko, Scratchers and Lucky Wheel debit on start and credit the stored server result once on reveal.
- Blackjack uses its server-secret-derived shoe, supports hit/stand/double/split, and returns no future shoe. Natural settlement and payout rules remain unchanged.
- Gacha costs 2,500 Treats or one Common Ticket. It selects missing puppies first from six explicitly free IDs, then duplicates after completion. No pity counter or protected-prize grant was found or added.
- Currency, ownership and unknown Android fields survive revision-checked writes. Two requests at one revision cannot both commit.

No prize-table mismatch was reproduced. Broader Kotlin/native design parity is not claimed. `mobile/App.jsx` is a separate preview entry using `src/app/UniversalApp.jsx`; the live website uses the copied `src/native/App.jsx` tree. The allowlisted engine sync remains pinned and is covered by existing tests; no unrelated upstream sync was performed.

## 4. Code changes made

| Files | Exact responsibility |
| --- | --- |
| `src/native/web/puppyOAuth.js` | Share one callback attempt; scrub to callback route; verify linked account before navigation; decode safe server errors; actionable messages. |
| `src/native/web/AccountGate.jsx` | Suppress startup auth-event races; ignore stale verification results; keep failed callbacks on a clear error page. |
| `src/native/web/recoveryCallback.js`, `src/RecoveryPage.jsx` | Share/await one email code exchange; scrub provider errors; read the account after exchange. |
| `src/supabaseConfig.js`, `src/supabase.js` | One public project configuration for session and exchange clients. |
| `supabase/functions/pup-web-auth/crossPlay.ts` | Redact legacy deck; supply pending-round hint; return explicit legacy blocker and allowlisted rule errors. Authoritative reducers and CAS are unchanged. |
| `src/native/src/production/kotlinCloudPreview.js` | Project the server's pending-native-round boolean without importing the deck. |
| `src/native/src/state/useGame.js`, `reducer.js` | Visible safe errors; preserve conflict messages after refresh; suppress duplicate casino/gacha transactions while preserving distinct queued care/shop actions. |
| `src/native/App.jsx` | Legacy-wager guidance, disabled Blackjack dealing, missing-save/owner startup state, gacha busy guard and stable result identity; remove unused web RNG/deck inputs. |
| `src/native/src/components/{SlotsV6,RouletteV6,PlinkoV6,ScratchersV6,LuckyWheelV6}.jsx` | Disable new wagers while legacy round is outstanding; send intent without client RNG. These are web copies, not Android entry files. |
| `tests/server-gameplay.test.js`, `tests/helpers/crossplay-db.js` | Execute actual server reducers and gateway against an isolated database fixture, including shared-row CAS races. |
| Callback unit tests, `e2e/auth-gameplay-regression.spec.js`, fixture/server files, `vite.config.js` | Signed-out callback/auth-event coverage; real server reducers behind an explicitly enabled dev-only test endpoint. |
| `e2e/mobile-app.spec.js` | Update a stale web account-page assertion to its existing “Cloud backup found” text. |
| `package.json`, `README.md` | Enable Node 22 TypeScript stripping for server tests; document callback/config/recovery behavior. |

## 5. Tests added/updated and commands run

```sh
npm ci
npm test                 # 119 passed
npm run build            # passed
git diff --check         # passed
```

Full browser suite: **50 passed**, including signed-out Discord and email callbacks with Auth events, denied callback, Slots payout/reload, gacha charge/reveal, double clicks, insufficient funds, revision conflict without replay, distinct delayed care actions, missing save and revoked owner.

The standard `npx playwright install chromium` failed because the returned browser archive was invalid. Tests ran successfully with an isolated npm-provided Chromium executable and a temporary Playwright config removing this environment's unstable single-process launch flag:

```sh
LD_LIBRARY_PATH=/tmp/puppy-chromium \
FONTCONFIG_PATH=/tmp/puppy-chromium/fonts \
npx playwright test -c /tmp/puppy-playwright.config.mjs --workers=2
```

Use `npm run test:e2e` with normally installed Playwright browsers in CI. The fixture alias and `/__e2e/gameplay` middleware are enabled only for `vite serve` with `PUPPY_E2E_FIXTURE=1`. Production output was checked for absence of the fixture endpoint and test secret. The browser fixture is intentionally isolated per request; concurrent CAS is tested against a shared row in the server unit fixture.

An optional Android compatibility export was attempted before the web-only clarification; it failed on an empty generated `public/assets/transparent/v2/v2_honey.png`. No Android fix or APK was produced. No tracked `mobile/` file changed. The web build passes after sequential asset generation.

Non-blocking existing output: Vite bundle-size warning and React Native Web JS-animation fallback warnings.

## 6. Environment/config changes required

No migration and no new variable are required.

- Web: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` must identify the same existing Pup Account project. Never supply a service-role key to Vite.
- Discord application `1547982688898777118`: register `https://puppy-clicker.vercel.app/auth/discord/callback` exactly. The native `discord-1547982688898777118:/authorize/callback` is separate and unchanged.
- Supabase Auth: allow `https://puppy-clicker.vercel.app/recovery` for email confirmation/reset links. Open PKCE links in the browser that initiated them.
- Release the website and updated `pup-web-auth` together, retaining its current gateway configuration and internal bearer/account checks. Keep existing Supabase server credentials and Blackjack seed stable.
- External CAPTCHA settings/site keys and Discord Developer Portal configuration were not modified. If Supabase CAPTCHA is enabled, its frontend/token integration requires the configured provider and public site key; do not disable protection to hide an error.

## 7. Manual QA checklist

- [ ] On production mobile browser and desktop, sign out, complete Discord's challenge once, and confirm the final route is `/play` with the linked account/save.
- [ ] Cancel authorization and try expired/wrong-browser callbacks; confirm a stable actionable error page with no automatic restart.
- [ ] Enroll/confirm a recovery email and reset a password in the same browser. Confirm the current linked account appears after exchange; check wrong-browser and expired links.
- [ ] Confirm unrelated/unlinked accounts, rejected legal consent, blocked accounts and revoked PupEye owners cannot enter gameplay.
- [ ] With no cloud save, confirm the website asks for the existing Android upload instead of starting a new economy.
- [ ] Complete the pre-existing legacy wager through the original supported Android flow and sync it. Refresh web; confirm the blocker clears without a second debit or refund.
- [ ] Test each casino's start/reveal and Blackjack moves with a staging save, including reload midway and one-time settlement.
- [ ] Pull gacha with each payment, verify roster/inventory and duplicate behavior; double-click and simulate concurrent Android revision changes.

## 8. Risks, rollback plan, and remaining blocks

**Not deployed.** Production remains unchanged until this branch and its web Edge Function are released. No live account gameplay mutation was performed during diagnosis.

The open legacy wager remains a real blocker for new web casino rounds. Auto-clearing it would discard an outstanding wager; trusting its client-created deck for new web settlement would violate the requested authority model. That recovery is not replaced by this web patch.

The exact live Discord/email human-challenge failure still requires manual reproduction and a sanitized error trace if it persists. Tests establish fixes for the callback/session races, not control over Discord's challenge or external email configuration. No unsupported claim that every Android behavior has been validated is made.

Rollback: revert this web branch and redeploy the preceding website plus `pup-web-auth` versions. There is no schema/data rollback. Prefer retaining deck redaction and clear legacy-wager errors if a partial rollback is needed. Do not rotate the casino seed or reset saves as a rollback mechanism.
