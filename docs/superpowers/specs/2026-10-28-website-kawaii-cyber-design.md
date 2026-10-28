# Puppy Clicker website — Premium Kawaii-Cyber design

Status: proposed implementation design; awaiting user review.

## Intent

Apply the user's full design-language guide and four supplied mobile/desktop reference images to the existing Puppy Clicker website. Make the game feel cute, polished, dark, and softly luminous while retaining the current game actions and authentic player progress.

This is a website UI overhaul, including responsive React screens and Tailwind CSS. It is not an Android release.

## Current source and constraints

- Website repository: `markhitchk/Puppy-Clicker`, baseline `main` commit `ac8c0be`.
- Vite serves React 19 and React Native Web. Tailwind is not installed yet.
- `src/App.jsx` owns the home page, account portal, and `/play` route.
- `src/native/App.jsx` owns the running game's Play, Care, Roster, Shop, Rewards, Casino, Gacha, Prestige, and responsive navigation.
- `src/native/src/theme.js` and `src/native/src/engine/settings.js` supply the existing appearance preferences and palette.
- `src/native/src/state/useGame.js` submits gameplay intents through the existing authenticated service and projects returned cloud saves. UI changes must preserve this path.
- `mobile/App.jsx` uses a separate `src/app/UniversalApp.jsx` entry. Do not modify that entry, Android source, native packaging, signing, save schemas, or service endpoints for this task.
- Keep every existing game destination accessible, including Settings, notifications, Exchange, Casino, Gacha, Prestige, and achievements.
- Resource balances, puppy availability, goal progress, claim eligibility, and shop prices must come from the existing state. Screenshot balances and developer unlocks are illustrative, not initial player data.

## Approach

**Recommended: update the website's existing React UI, preserving its engine and auth.** Add Tailwind to Vite and use dedicated web layout/components for the presentation that needs browser CSS, while retaining the existing game hooks, action callbacks, and secondary game screens. This supports the requested visual fidelity without rebuilding the economy.

Other approaches considered:

| Approach | Tradeoff |
| --- | --- |
| Palette and CSS changes alone | Smallest change, but cannot deliver the new Play composition or roster/shop split faithfully. |
| Replace the entire app and engine | Duplicates working game behavior and expands the risk and scope beyond a UI overhaul. |

Implementation choices below are proposed defaults, not additional user requirements.

## Design system

Use the user's exact default dark palette:

| Token | Value |
| --- | --- |
| bg-primary | `#0A0C12` |
| bg-secondary | `#12151F` |
| bg-elevated | `#1A1E2B` |
| bg-modal | `#161A25` |
| accent-cyan | `#00E5FF` |
| accent-cyan-soft | `#00C4E0` |
| accent-purple | `#7B5CFF` |
| accent-pink | `#FF5C9D` |
| accent-gold | `#FFD166` |
| accent-green | `#34D399` |
| text-primary | `#FFFFFF` |
| text-secondary | `#A0A8C0` |
| text-tertiary | `#6B7280` |

- Define one token source for CSS/Tailwind and the website's React Native Web palette bridge.
- Default card borders: `1px solid rgba(0,229,255,0.20)`; stronger active borders and `0 0 20px rgba(0,229,255,0.35)` glow.
- Cards and modals use 20–24px corners and 16–20px internal padding. Buttons use full-pill corners. Categories may use 12px corners.
- Primary buttons use a cyan gradient, readable text, and restrained interaction glow. Secondary actions use dark fills, cyan borders, and cyan text.
- Use Inter where available, then SF Pro Display and system sans-serif fallbacks. Titles use 28–32px/700; section headings 20–22px/600; body 14–15px/400; captions 12–13px/500; buttons 15–16px/600.
- Use the supplied 4, 8, 12, 16, 20, 24, 32, 40px spacing scale. Section gaps are 20–28px.
- Progress tracks are 6–8px high, rounded, with cyan gradient fills.
- Apply the same primitives to Care, Rewards, Settings, notifications, and supporting screens so the main screens do not look like a separate app.
- Preserve explicit appearance, contrast, and reduced-motion preferences. Use the new palette as the default dark appearance; do not overwrite saved preferences.

## Responsive shell

- One responsive website, not separate mobile and desktop apps.
- Proposed breakpoints: phone under 768px, tablet 768–1199px, desktop from 1200px.
- Phone: compact brand/header with notifications and settings; five-item bottom tab bar for Play, Care, Roster, Shop, Rewards.
- Desktop: persistent left navigation, compact player level/streak header, and content panels with sufficient room for gameplay. Avoid duplicate brand bars consuming vertical space.
- Preserve Home and Account navigation through accessible desktop links and a compact mobile menu. Existing `/`, `/account`, `/play`, and Discord callback routes continue to work.
- Respect safe-area insets and ensure content scrolls above the bottom navigation. Do not shrink buttons or text to force short screens into a fixed height.
- Keep all layouts free of unintended horizontal overflow. Category strips may scroll horizontally.

## Play screen

### Phone/tablet

1. Title and short description.
2. Resource strip with icon, formatted value, and label for Treats, Bones, Pup Coins, Casino Chips. Retain exact-balance access.
3. Large puppy stage with existing transparent puppy artwork, a CSS-rendered glowing cyan platform, restrained paw particles, puppy name, and Current Puppy badge.
4. Previous/next puppy buttons cycle through unlocked puppies using the existing switch intent. Also provide an explicit Switch Puppy link to the roster.
5. Energy and care-bonus strip derived from live state.
6. Large pill tap action with the current puppy name and actual reward amount; preserve cooldown and tired-puppy behavior.
7. Next Reward card with current goal, accessible progress bar, count, and reward. Preserve the existing all-claimed state.
8. Bottom navigation.

### Desktop

- Left content panel: title, current puppy identity, switch/rename affordances, large puppy stage and tap button, next reward.
- Right column: resource panel, today's goals with individual progress/claim controls, compact Pup Care Status with existing need values and Go to Care action.
- Top strip: actual player level/XP and actual daily streak. Never use the screenshot's max-level values as defaults.
- Render every scheduled goal; do not silently omit extra goals when a monthly schedule contains more than the reference image.
- Keep the complete Care screen available through navigation; the Play care summary is compact rather than embedding the full action screen.

## Roster

- Current Puppy hero always represents the equipped puppy, with larger artwork, display name, asset ID/category, favorite action, rename, and accessory control.
- Inspecting a different puppy opens its existing details flow without changing the Current Puppy hero. Equipping is an explicit action and remains restricted to unlocked puppies.
- Retain search by name/ID, All/Unlocked/Locked filter, horizontally scrolling category chips, sort options, Favorites filter, result count, artwork retry, and empty state/reset.
- Use two columns on phone as specified in the written guide; the supplied roster image shows three, so prioritize the explicit two-column requirement for readable mobile cards.
- Use adaptive columns on tablet/desktop, with sufficient artwork and text space. Cards show image, name, ID, category, unlocked/locked/current status, and favorite control.
- Use original available puppy assets at appropriate resolution with `object-fit: contain`; preserve transparency and retry/fallback behavior. Do not crop puppies out of the reference screenshots.

## Shop and desktop split

- Standalone Shop remains a main destination on all screen sizes.
- On desktop, the Roster view includes a right-hand Shop panel, reusing the same Shop component and state rather than maintaining another purchase implementation.
- Show current currency, Redeem Code/Pups access, Upgrades/Tickets/Pup Coins tabs, and existing upgrade/accessory/ticket offers.
- Upgrade rows have a clear icon, title, description, ownership/effective level, and price/upgrade/MAX control.
- Display the green Smart Shopper badge only when the existing skill is active. Derive any percentage from the actual pricing logic; do not hardcode the reference's 10% discount.
- Maintain existing affordability, caps, ownership, server error, and unavailable-service behavior.

## Modals

- Shared centered dark modal surface with 20–24px corners, soft cyan border, and dimmed background.
- Implement the Casino confirmation with clear explanatory text and GO BACK / CONTINUE controls. Use the existing eligibility and action rules; do not introduce a new policy or entitlement system.
- Route existing browser Alert confirmations through an accessible web dialog where appropriate so critical interactions follow the same visual language.
- Trap focus, label dialogs, support Escape where cancellation is permitted, restore focus on close, and prevent background interaction.
- Avoid nested dialogs and preserve pending-action safeguards.

## Proposed file boundaries

| Files | Responsibility |
| --- | --- |
| `package.json`, lockfile, `vite.config.js` | Tailwind build integration |
| `src/styles.css`, new `src/web/design-system.css` | Tokens, Tailwind theme, shared surfaces, responsive shell and component styling |
| New `src/web/` React components | Web layout, Play presentation, compact goals/care summary, shared dialog and display primitives |
| `src/native/App.jsx` | Connect web presentation to existing game state/actions; roster grid/current hero and desktop split integration |
| `src/native/src/theme.js` | Website appearance token bridge |
| `src/native/webCompat.js` | Styled browser dialog integration for existing Alert callers |
| `src/App.jsx` | Harmonize home/account chrome and preserve route navigation |
| `e2e/` | Responsive gameplay, roster, shop and dialog regression checks |

Refine component names during implementation; avoid changing engine modules to achieve styling.

## Validation and acceptance

- Run the repository's complete `npm test` suite and `npm run build`.
- Exercise the website at widths 360, 390, 768, 1280, and 1920px, including a short mobile viewport.
- Verify tapping still changes authoritative fixture balances and next-goal progress; tired puppies cannot earn taps until cared for.
- Verify roster filters, sort, details, current hero, favorites, rename/accessory controls, and empty results.
- Verify the desktop split Shop and standalone Shop expose the same offers and actions; unaffordable actions stay disabled.
- Verify modal cancel/continue, keyboard navigation, focus return, settings/notifications, and all existing game destinations.
- Check long puppy names/large balances, locked and missing artwork, all-claimed goals, and reduced motion/high contrast.
- Visually inspect mobile/desktop Play, Roster, Shop, and Casino confirmation against the four supplied references. Confirm no page overflow, clipped tap action, or hidden bottom content.
- Keep account/login and save-boundary tests passing. Production account operations are not replaced with test fixture behavior.
- Prepare the finished implementation as a reviewable branch/PR and use the existing Vercel project. Report any build/deployment blocker and distinguish tested fixture behavior from unverified live account actions.

## Review decision

Approve this website-only implementation scope to begin the code changes. The visual guide supplied by the user remains the design authority; this document specifies how to apply it to the existing website.
