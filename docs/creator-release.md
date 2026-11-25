# Creator release checklist

## Setup (do not expose secrets)
1. In the official Discord server, create a private developer-only puppy-submissions channel. Create a dedicated incoming webhook in its Integrations settings.
2. Add PUP_CREATOR_DISCORD_WEBHOOK_URL as a server-only sensitive environment variable in the Puppy Clicker Vercel project. Use a separate test channel/webhook for preview. Do not reuse ban/anti-cheat webhooks or put the URL in source, chat, or client-side environment variables.
3. Apply the private submission migration to a test database first; confirm RLS and service-role-only grants, account deletion cascade, daily quota, idempotency, and server-only access. Do not apply to production until review.
4. Verify /creator, /creator/v1, /creator/v2, /creator/submissions and /account/admin/creator. Confirm anonymous, suspended, banned and non-owner requests are denied. Confirm Discord receives the sanitized preview and package; simulate failed delivery and retry. An ambiguous network result is not automatically retried to avoid duplicate messages; reconcile manually.
5. Establish a retention policy for Discord attachments and declined/archived projects. Database account deletion removes private rows; Discord attachments must be separately deleted by the channel administrator as required.
6. Official publication remains blocked: the existing roster assets originate from the Android source repository, web roster is generated/synchronized, gameplay engine recognizes bundled IDs and server-side rarity/transfer policy is authoritative. A separate staged publishing transaction must update canonical assets, validated manifest, engine and server allowlists, rarity/transfer catalog and optional gift claim; do not simply insert a display entry or grant an unknown ID.

## Current scope
The private submission and review/import queue is implemented in source but not yet end-to-end tested. Approval means moderation approval only, not publication. The original artwork and existing server ownership rules are unchanged. Do not merge the full release until the specification's acceptance tests and publication workflow pass.

## Verification
Targeted mask and schema-validation tests are available in tests/pup-creator-mask.test.js and tests/pup-creator-submission.test.js. Run npm test, npm run build and npm run test:e2e. Production dependencies and API bundling must be verified on preview, including sharp and the two template files. Verify configured Discord delivery using original test artwork and an authorized test account.
