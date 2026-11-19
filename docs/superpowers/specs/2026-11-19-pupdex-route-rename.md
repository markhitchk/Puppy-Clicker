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

## Additional QoL requests accepted during review
- Add an explicit show/hide control for username/password sign-in and registration, including password confirmation. Reuse the same accessible widget on password changes and recovery.
- Keep the underlying native input, `name`, `autoComplete`, input events, password manager autofill, and form submission unchanged when showing a password.
- Find and style remaining plain-text hyperlinks as button-shaped **anchors** across the entire website, not just landing-page CTAs; retain native link semantics, new-tab behavior and keyboard navigation.
- Exempt brandmarks, full-card hit areas and the static logo-only site footer.
- Make secondary action groups compact (PupEye breadcrumbs, legal document contents, inventory, account menus, desktop sidebar) with readable contrast and touch-friendly targets.
- Verify with both unit assertions and real Playwright browser interaction tests on signed-out login/registration and mobile layouts.
