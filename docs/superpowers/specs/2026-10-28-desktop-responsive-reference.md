# Desktop reference and mobile account spacing design

**Intent:** Match the supplied Puppy Clicker desktop play render while retaining a separate, readable phone layout. Keep verified Pup Account and gameplay logic unchanged.

**Findings:** The browser game renders DesktopPlayScreen and its sidebar at JS width >= 1000px; the desktop CSS has a matching >=1000px media query. Chrome Android's desktop-site viewport can be ~980 CSS pixels, leaving the app in a shrunken, centered mobile view. The render also shows a nighttime yard scene absent from the desktop panel. On the homepage the account actions mix inline pills and an inline recovery link with no layout separation. The authenticated account refresh action uses intrinsic width while adjacent actions stretch.

**Implementation:** Set the desktop boundary to 960px in React and its desktop/mobile CSS selectors; add the existing /assets/scenes/night-yard-v1.webp as the background of only the desktop puppy panel with a dark overlay; and correct the homepage and account action spacing with mobile-safe CSS. Do not modify web auth, save, economy, gameplay or Android code.

**Alternatives:** A) lower breakpoint consistently (chosen; desktop-site view on phones works), B) force desktop based on device detection (fragile browser sniffing), C) create a separate desktop game app (unnecessary duplicate logic).

**Verification:** Extend Playwright checks for 960/980 widths, correct background image and lack of clipping; regression check home account links at 390px. Execute npm test, npm run build and npm run test:e2e in GitHub CI. Desktop and mobile scenes remain separate; the same existing puppy art and real actions are reused.
