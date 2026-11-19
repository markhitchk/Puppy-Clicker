# Puppy Clicker web passkeys — rollout and security

## Architecture

- Supabase Auth WebAuthn passkeys (currently **experimental/beta**) handle challenge creation, public-key signature verification, credential management and session issuance.
- The existing `src/supabase.js` encrypted session storage is preserved.
- The verified `pup_web_auth_links` mapping and PupEye server checks remain required after passkey sign-in. A Supabase Auth session **alone** must never grant a Pup Account.
- Password and Discord login remain available; passkeys are opt-in, not required to create a new account. Never enroll passkeys for arbitrary logged-out browser users.
- No custom WebAuthn private keys, raw credential assertions or Auth refresh tokens are written to our tables or browser logs.

## Hosting configuration (required BEFORE using the feature)

This repository change enables the Supabase JS experimental passkey API, **not** the hosted Supabase Auth project toggle. A project admin must configure:

1. Supabase dashboard for project `damcmyqusdxucwozkoeh` → Authentication → Passkeys → **Enable Passkey authentication**.
2. RP display name: `Puppy Clicker`.
3. RP ID: `puppy-clicker.vercel.app`.
4. Allowed RP origin: `https://puppy-clicker.vercel.app`.
5. Keep this RP ID stable. Changing it invalidates already-registered passkeys.
6. Test on real Chrome/Android and desktop browser with a test account that has a verified Pup Account link and confirmed Supabase Auth identity before production release.

Do **not** add ephemeral Vercel preview origins to the relying-party configuration. Do not enable passkey UI on any non-production hostname. For a future custom domain, design an RP migration strategy before switching.

If the dashboard toggle is disabled, the UI may report `passkey_disabled`. Do not claim passkeys work until a real registration and sign-in round-trip succeeds on production.

## Security guarantees / non-guarantees

- Supabase validates challenges and origin/RP ID. Device biometrics/PIN unlock the authenticator, and are not provided to Puppy Clicker.
- Accounts are still protected by server-side authorization and anti-cheat; do not rely on browser-side DevTools detection or shortcut suppression.
- Browser Developer Tools cannot be reliably disabled by JavaScript and hiding Inspect does not protect any secret shipped to the browser. Keep server secrets server-only, and continue CSP/XSS/RLS defenses.
- Passkeys reduce phishing and reused-password risk, but do not prevent XSS from manipulating an already authenticated session.
- Treat adding/removing passkeys as sensitive account operations; log metadata only, not credential data. Keep password/Discord recovery pathways active.
- Optional Android-native support needs separate Android app association and release signing certificate handling.

References:
- https://supabase.com/docs/guides/auth/passkeys
- https://supabase.com/docs/reference/javascript/auth-signinwithpasskey
- https://supabase.com/docs/reference/javascript/auth-registerpasskey

## Tests

- Run `npm test`, `npm run build` and `npm run test:e2e`.
- Test existing username/password, Discord and recovery paths unchanged.
- Verify passkey sign-in fails closed for a valid Supabase user lacking a Pup Account link.
- Verify unsupported/preview browsers are offered the original sign-in methods.
- Test one passkey enroll, sign-in, rename, delete and sign-in-with-deleted-passkey failure with a real authenticator.
