# Web visitor network reputation (VPN / proxy / Tor)

This feature applies to **the Vercel website only** and does not edit the Android application or the existing PupEye/global ban enforcement.

## Behavior
- Optional `NetworkCheckReporter` calls `POST /api/network-check` on initial load and when the signed-in Supabase session changes.
- The Vercel Function trusts its **platform-managed** `x-vercel-forwarded-for` header; browser-provided IPs in JSON or query parameters are ignored.
- Server-side proxycheck.io v3 classification records separate `vpn`, `proxy`, `tor`, `hosting`, `anonymous`, `confidence`, and `risk_score` fields. Missing or failed responses are **unknown**, never a ban verdict.
- Supabase Auth access tokens, if sent by the site, are verified on the server. The user is associated with a Pup Account only if `pup_web_auth_links` has a verified link. Anonymous checks are left unassociated.
- A private database table stores checks for future `/account/admin` audit history; the website response never contains the checked IP or risk findings.
- No automatic bans, denies, or Discord alerts. Public VPNs, private VPNs, Apple/private relay, mobile carrier gateways and VPN-like networks can create false positives or bypass detection. Do not use this as proof of malicious behavior.

## Deployment prerequisites

1. Review the privacy policy and inform players that IP / User-Agent and third-party network reputation information are processed. Set a bounded retention policy (30 days suggested). Check compliance with applicable privacy law.
2. Apply the reviewed `docs/security/web-network-detection.sql` to the correct Puppy Clicker Supabase project. This should be migrated through the normal schema release process, not run ad hoc against other games' data.
3. Add SERVER-ONLY environment variables in the Puppy Clicker Vercel project:
   - `PROXYCHECK_API_KEY` (OPTIONAL: keyless requests are free for 100 lookups/day per Vercel egress IP; a free registered key allows 1,000/day). Sign up at https://proxycheck.io/ only if the keyless quota is insufficient.
   - `SUPABASE_URL` (Pup Account project)
   - `SUPABASE_SECRET_KEY` (secret/service-role key **only on the server**)
4. Set frontend `VITE_NETWORK_CHECK_ENABLED=true` in that project's environment and rebuild.
5. Verify `/api/network-check` is correctly routed to the Vercel Function (not the Vite SPA fallback). Check database inserts for a VPN, known normal network, and unavailable provider. Confirm a user from a different Supabase-linked app is not associated with Pup Account.
6. Add edge/WAF rate limits to `/api/network-check` to protect API quota, and monitor vendor errors. The best-effort in-memory lookup cache is per serverless instance, not a distributed limiter.
7. When the role-protected admin pages are implemented, expose results through a *separate* staff-only endpoint, with paginated queries, audited access, and no direct browser Data API permissions.
8. Review the Google Play install banner separately; it defaults to https://play.google.com/store/apps/details?id=com.harleytg.puppyclicker.

## Troubleshooting
- `recorded:false` means Vercel did not persist a record (e.g. missing Supabase secrets/schema or no trusted public client IP).
- Without an API key, proxycheck.io still performs VPN/proxy/Tor checks using its free anonymous tier (100 checks/day per requesting IP). Provider outages, malformed responses or exhausted quotas are recorded as `unknown`, never \"not detected\".
- The free keyless limit may be exhausted by other requests sharing a Vercel outbound address. Add WAF rate limits and caching before enabling in production. Browser localStorage is not a security boundary.
- Never put `SUPABASE_SECRET_KEY` or an optional `PROXYCHECK_API_KEY` in a `VITE_` variable. Treat IPs, UA strings, and reputation results as personal data. These IPs are also sent to the reputation provider.
