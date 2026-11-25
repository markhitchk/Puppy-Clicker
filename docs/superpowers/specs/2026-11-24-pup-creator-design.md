# Pup Creator Studio — freeform artwork editor

Goal: Players paint directly on the real V1/V2 crash dummy art, or start on a blank transparent canvas. No preset-only restrictions. Preserve the existing roster and server-owned unlocks.

## Implementation plan
1. Add a React route /creator using existing site shell and original /assets/test/v1_test_crash_dummy.png and v2 equivalent.
2. Implement bounded canvas history, brush, eraser, fill, eyedropper, line, rectangle, ellipse, text, imported raster art, horizontal symmetry and zoom; use pointer events for mouse, touch and stylus.
3. Export transparent PNG and data-only JSON .pup packages, restore drafts/import packages after strict format and size checks.
4. Verify through Playwright for template load, painting, undo/redo and download. No changes to gameplay catalog/ownership.
5. Separate authenticated Discord submission and owner-only roster publication from the local editor; do not imply these are enabled until their server-side storage, moderation, configuration and tests are complete.

Design decisions: 512px square artboard; raster editing rather than a 3D model or vector editor; single flattened artwork with history, not editable layer stacks. The generation remains metadata and original artwork is not overwritten. Local draft stays in the browser. No new dependencies.
