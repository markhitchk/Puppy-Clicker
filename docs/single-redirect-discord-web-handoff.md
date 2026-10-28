# One-redirect Discord sign-in for Puppy Clicker

**Only registered Discord redirect:** `discord-1547982688898777118:/authorize/callback`.
The web app **does not** request an HTTPS callback and does not use the
ARC Raiders Supabase Discord provider.

This login uses an installed **updated Puppy Clicker React Native Android app**.
The website generates PKCE state/verifier and poll secret; stores them in its
own browser local storage; creates a short-lived private relay; and starts Discord.
Discord returns the code to Android's existing app-specific callback. The native
app forwards **only code and state** to `pup-web-discord-relay`; it never takes
the website verifier. The browser resumes/polls with its secret and exchanges
the code against Discord using the **same single Android redirect**, then
validates the resulting Discord user ID against an active native Pup Account.
Anonymous RLS cannot read the relay table.

## Setup
1. Register the custom `discord-...` redirect only in the **Puppy Clicker**
   Discord application, not ARC Raiders.
2. Deploy `supabase/functions/pup-web-discord-relay/index.ts`, with
   `verify_jwt=false` (the endpoint verifies a per-flow random secret and PKCE
   on exchange). Apply the private relay SQL migration first.
3. Deploy the revised `pup-web-auth` function which exchanges the code using
   the Android custom URI; it must **not** accept the obsolete HTTPS URI.
4. Install a React Native Puppy Clicker APK **built after** the
   `WebDiscordHandoff` component was added to `Mobile/App.js`.
   An older APK cannot forward the browser's code and will not work.
5. On Android, choose the **updated React Native Puppy Clicker** application
   when Android offers a chooser for the `discord-...` link. An older Kotlin
   or beta APK may also claim the same custom URI.
6. On Android web, tap Discord, authorize, and choose to return to the browser
   from the app; the website resumes the pending request. On desktop, copy the
   supplied Discord login URL to the Android device; keep the desktop browser
   open while the updated Puppy Clicker Android app forwards the result.
7. The independent Pup username/password sign-in still works without Android.

**Limitations**: Web Discord login requires updated Android app. Desktop Discord
login requires a phone with that app. Never represent the website as having
PupEye device authority or native signed cloud-save write access. Keep old
website saves separate from Android signed Pup Account cloud saves.

**Security**: 5-min request expiry, unique 256-bit flow nonce, independent
256-bit poll secret, PKCE S256, one-time code consumption, Supabase service
role-only relay table, active account/legal checks, and existing global ban checks.
No service-role key in client/mobile code.
