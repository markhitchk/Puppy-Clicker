# Outline Creator implementation plan

Approved input: Pup Creator Studio specification. Existing branch is isolated and five commits ahead of main. Both source PNGs were visually inspected: crash-test markings and dark detail are present. Use runtime generation of a versioned silhouette/structural-edge guide from those exact assets; release requires visual review of both derived outlines. No original asset changes.

1. Add pure mask/outline derivation and constrained fill tests, including anti-aliasing and edge barriers.
2. Add trusted template manifest and browser canvas compositor; render user layers separately, composite them once through the alpha mask, then overlay the protected line art. Use a binary support mask for editing to avoid repeated edge-alpha attenuation.
3. Upgrade editor: outline default, original colors, reference toggle, bounded editable layers/history, safe imports/exports and local storage. Add direct V1/V2 routes and mobile controls.
4. Add browser acceptance tests for default outline, edge clipping, export and layers. Verify browser/build before release.
5. Discord and roster publication are separate gated tasks; require private channel secret, storage, identity verification, canonical ownership integration, and full end-to-end tests. No production deployment until verified.
