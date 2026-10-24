import { test, expect } from "@playwright/test";
import { completeOnboarding } from "./onboarding.js";

// Visual-layout contract translated from Kotlin's generated sources, not guessed
// CSS values. These assertions also catch double-padding and old React headers.
for (const width of [360, 768, 1280]) {
  test(`generated Kotlin Play layout contract at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    await completeOnboarding(page);

    const header = page.getByTestId("kotlin-fixed-app-bar");
    const wallet = page.getByTestId("kotlin-wallet");
    const puppySurface = page.getByTestId("kotlin-puppy-surface");
    const reward = page.getByTestId("kotlin-next-reward");
    const nav = page.getByTestId("game-nav");
    const tap = page.getByTestId("kotlin-tap-button");
    await expect(header).toBeVisible();
    await expect(wallet).toBeVisible();
    await expect(puppySurface).toBeVisible();
    await expect(reward).toBeVisible();
    await expect(nav).toBeVisible();
    await expect(tap).toContainText("Tap Buddy");

    const [h, w, surface, strip, navBox] = await Promise.all(
      [header, wallet, puppySurface, reward, nav].map(async (locator) => locator.boundingBox())
    );
    expect(h).not.toBeNull();
    expect(w).not.toBeNull();
    expect(surface).not.toBeNull();
    expect(strip).not.toBeNull();
    expect(navBox).not.toBeNull();

    // Kotlin fixed app bar is 48dp * compact density 0.94.
    expect(Math.abs(h.height - 48 * 0.94)).toBeLessThan(2);
    // Kotlin source orders the wallet above the center-weighted puppy card,
    // with the next reward strip after the card.
    expect(w.y + w.height).toBeLessThan(surface.y + 2);
    expect(surface.y + surface.height).toBeLessThan(strip.y + 2);
    expect(surface.width).toBeGreaterThan(250);
    if (width < 840) {
      expect(Math.abs(navBox.height - 80 * 0.94)).toBeLessThan(3);
      expect(Math.abs(w.x - (Math.max(0, (width - 640) / 2) + 14 * 0.94))).toBeLessThan(4);
    }
    await expect(page.getByText("Pup Coins", { exact: true })).toBeVisible();
    await expect(page.getByText("Casino Chips", { exact: true })).toBeVisible();
  });
}
