# Canonical PupDex website endpoint
Date: 2026-11-19
Scope: Website only. Follow-on to PR #96 Quality-of-Life changes.

## Design
- Rename the public puppy gallery route from `/puppies` to `/pupdex`.
- Keep puppy deep links at `/pupdex?pup=<asset ID>` (including the existing legacy query aliases).
- Existing `/puppies` bookmarks permanently redirect to `/pupdex`, retaining all query parameters. The website app also canonicalizes old URLs in local Vite/static previews.
- Update website navigation labels, footer-independent content links, inventory and card copy/share actions, Open Graph and Twitter link metadata, and Vercel middleware.
- Keep the gallery, modal, rarity filters, high-resolution artwork, cloud save behavior, and native app intact.

## Verification
- Migrate unit and E2E expectations to the new route.
- Test legacy deep-link redirection with the selected puppy and tracking query intact.
- Verify website build and browser CI before merge; distinguish merging from Vercel production deployment.
