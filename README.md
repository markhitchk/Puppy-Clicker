# Puppy Clicker — React Web Edition 🐶

An independent, mobile-friendly **React + Vite** port built from the actual Kotlin Android project and the existing browser prototype in [markhitchk/pup-clinker](https://github.com/markhitchk/pup-clinker).

## Implemented

- Responsive puppy tap stage, Treat economy, level and stats
- Passive income (up to four hours offline), combo counter, 1% upgrade-ticket drops
- Source-defined V1/V2 roster (29 original puppy images, respecting reward locks)
- Shop upgrades, ticket costs, care and wellness
- Treat-only Scratchers, Slots, Roulette and basic Blackjack
- Discord OAuth via Supabase Auth
- **Authenticated web-only** save with RLS, autosave, manual sync, revision conflicts
- Built for Vercel or local Vite development

**Not yet parity:** Android's full game logic, PupEye attestation, anti-cheat, daily rewards, achievements, codes, premium admin systems, automatic Android↔Web cloud-save linkage, all casino variants. Web progression intentionally cannot overwrite Android PupEye saves. Do not treat this as a complete Android replacement.

## Local development

Requires Node 22.12+.

1. \`npm install\`
2. \`npm run dev\`
3. Open the local address shown by Vite.

The client uses the **publishable** Supabase project URL/key for Puppy Clicker DB as defaults. You may override with \`VITE_SUPABASE_URL\` and \`VITE_SUPABASE_PUBLISHABLE_KEY\` in an uncommitted \`.env.local\`. **Never** add service-role keys or Discord client secrets to the browser or a \`VITE_\` variable.

Guest demo is playable without logging in, but its progress **does not save**. Discord-authenticated users get isolated cloud saves.

## Deploy to Vercel

1. Import **markhitchk/Puppy-Clicker** into Vercel; select **Vite** (repository root).
2. Build command: \`npm run build\` (or \`vite build\`); output directory: \`dist\`. The \`vercel.json\` handles SPA rewrites.
3. Use Node 22+ and configure \`VITE_SUPABASE_URL\` and \`VITE_SUPABASE_PUBLISHABLE_KEY\` if you need to override the built-in publishable config.
4. In [Supabase Authentication](https://supabase.com/dashboard/project/damcmyqusdxucwozkoeh/auth/providers), enable Discord with a Discord application's **client ID and client secret (server-side dashboard only)**. The provider redirect/callback in Discord must target \`https://damcmyqusdxucwozkoeh.supabase.co/auth/v1/callback\`.
5. In [Supabase Auth URL Configuration](https://supabase.com/dashboard/project/damcmyqusdxucwozkoeh/auth/url-configuration), add your production URL and preview URL pattern to allowed redirect URLs (and \`http://localhost:5173/**\` for local development). Without this, Supabase may reject Discord sign-in.
6. Merge your reviewed PR to \`main\`; Vercel can deploy it on push once your GitHub repository is connected.

The SQL migration \`supabase/migrations/20261023_puppy_web_saves.sql\` has already been applied to the existing Puppy Clicker DB. Do not reapply blindly or loosen policies on \`pup_account_saves\`.

## Security / save model

\`public.puppy_web_saves\` stores only web-edition progression, owned by \`auth.uid()\`. Clients must be authenticated. \`public.puppy_web_save_commit\` uses optimistic revision checks; on conflict the app refuses to overwrite the cloud save. RLS prevents cross-user reads/writes, and the web client contains no privileged credential.

**Important:** Because game mechanics still run client-side, authenticated users can manipulate their own web progression. Do not share these values with Android accounts, competitive leaderboards or prizes until server-authoritative transaction and anti-cheat verification are implemented. The existing PupEye-protected tables and functions are untouched.

Original images are displayed from the publicly accessible \`pup-clinker\` GitHub raw asset paths; no placeholder art or duplicated source asset library. For higher-traffic production, package approved optimized versions via an asset pipeline/CDN.

## Verification

\`npm run test\` checks core mechanics; \`npm run build\` produces \`dist\`. GitHub Actions also runs those checks. Full interactive browser and OAuth tests require a deployed app and an authorized Discord provider.

© Harley's Studios. Original Puppy Clicker artwork/code rights remain with the owner.
