# Puppy Clicker — correct Discord OAuth

The website **must not** call `supabase.auth.signInWithOAuth({provider:"discord"})`.
That provider belongs to the shared Supabase project and may display **ARC Raiders**
or another game's OAuth application.

Instead, browser sign-in uses the same **Puppy Clicker Discord application**
as the Android build, public application ID `1547982688898777118`.
Authorization-code + PKCE redirects to
`https://puppy-clicker.vercel.app/auth/discord/callback`.
A Puppy-specific Supabase Edge Function exchanges the code and verifies Discord
`/users/@me` **before** associating an existing `pup_accounts` record.
No ARC Raiders account registration, no guest access, no client-side service key,
and no impersonated Android installation or PupEye signature.

## External prerequisite

Add the **exact Redirect URI** to the **Puppy Clicker** Discord application
in Discord Developer Portal → OAuth2 → Redirects:

`https://puppy-clicker.vercel.app/auth/discord/callback`

Without this allowlist entry Discord will reject authorization; never fall back
to the ARC Supabase provider. Do not change the ARC Raiders Discord application
or its redirects.

## Server-side setup

- Apply `supabase/migrations/20261028095500_pup_web_auth_links.sql` in the
  Puppy Clicker DB (RLS on, service-role only).
- Deploy `supabase/functions/pup-web-auth/index.ts` with `verify_jwt=false`.
  The function explicitly validates credentials and session JWTs.
- The Edge Function requires normal Supabase service environment variables
  and uses Discord's public PKCE code exchange, identical to Android. No
  Discord client secret is placed in the browser.
- For new Discord sign-in, an **existing active Pup Account** must already be
  linked to the Discord identity using the Android app. Web sign-in does
  **not** create a new PupEye player or grant second-device authority.
- Existing ARC Raiders Supabase sessions are rejected by the website,
  and old browser saves are left unchanged.
- Pup username/password is verified against the existing private
  `pup_credential_links` mapping; generic email auth is not a substitute.

## Security notes

`pup-web-auth` checks active account status, confirmed legal consent,
server-side Discord identity, and global ban targets. An authenticated
Supabase session is still **web only** and authorizes the independent
`puppy_web_saves` table, not device-bound PupEye signed transactions.

Because the Discord Developer Portal is external, release of the new login
requires its redirect allowlist entry. Verify a real sign-in on web after
configuring that redirect; E2E tests only simulate the OAuth exchange.
