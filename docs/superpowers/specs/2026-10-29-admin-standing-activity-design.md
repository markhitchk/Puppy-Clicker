# Registered Pup Account administration

The owner requests suspension, timed account bans, readable administration records, connected website users/devices, and login/registration failures. Keep the directory limited to `pup_accounts`; leave Android installation identities, saves, inventory, and balances unchanged.

Use the existing shared PupEye global-ban enforcement for both suspension and bans. Suspension requires an expiry; bans may be timed or permanent. Record a distinct suspension reason code, show the effective standing and end time, and permit staff to lift website-issued restrictions. Preserve existing role/self-sanction protections.

Create private website session/event tables and the missing network-check table. Record browser presence every 30 seconds while visible; label sessions active when seen in the last 90 seconds. Server auth instrumentation records verified outcomes and safe error codes for password/Discord login and registration. Browser diagnostics are explicitly distinguished from server-verified events. Infer device/browser from user agent; do not claim access to hardware identifiers. Collect no passwords, tokens, OAuth codes, URLs with queries, raw exception messages, or arbitrary client metadata.

The admin console gains Activity & Devices, summary counts, search and event filters, readable event names and details, resolved account names, and an accessible restriction dialog with duration presets/custom expiry. Counts refresh without filling the audit history with repeated directory reads. Existing Android devices may be displayed read-only only when linked to a registered account.

Approach: extend existing Vercel APIs, Supabase Edge auth, and shared ban tables. A standalone moderation service duplicates enforcement; a display-only change leaves telemetry absent. No new service or dependency is needed. Native Supabase service-role access remains server-only, with RLS and no browser table privileges.

Verification covers expiry validation, enforcement/role boundaries, server-only success events, payload redaction, online-session expiry, friendly formatting, database permissions, production build, and the rendered admin flow. Publish the repository changes through its existing Vercel deployment.
