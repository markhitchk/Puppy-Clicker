import { completeOnboarding } from "./onboarding.js";
import { test, expect } from "@playwright/test";
for (const width of [360, 768, 1280])
  test(`Kotlin launcher, rewards, roster and theme at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await completeOnboarding(page);
    await expect(
      page.getByText(/^(Tap your puppy and earn treats\.|Tap, earn treats, and have fun with your puppy!)$/),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Tap puppy to earn Treats", exact: true })
      .click();
    await expect(page.getByTestId("next-reward")).toContainText("1/");
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page
      .getByRole("button", { name: "Puppy Roster", exact: true })
      .click();
    await page.getByRole("textbox", { name: "Search puppies" }).fill("Sunny");
    await page.getByRole("button", { name: "Use Sunny", exact: true }).click();
    await page.getByRole("button", { name: "Care", exact: true }).click();
    await expect(
      page.getByText("Sunny", { exact: true }).first(),
    ).toBeVisible();
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    // The generated Kotlin shell hides bottom navigation on internal Settings.\n    await page.getByRole("button", { name: "Back", exact: true }).click();\n    await page.getByTestId("game-nav").getByRole("button", { name: "Rewards", exact: true }).click();
    await page
      .getByRole("button", { name: "Claim Daily Puppy Gift", exact: true })
      .click();
    await expect(page.getByText("Daily Puppy Gift claimed")).toBeVisible();
    await page
      .getByRole("button", { name: "Claim Healthy Pup", exact: true })
      .click();
    await expect(page.getByText("Healthy Pup · Claimed")).toBeVisible();
    // Inbox history survives a browser restart for the local guest profile.
    await page.getByRole("button", { name: "Notification history" }).click();
    await expect(page.getByText("Daily Puppy Gift claimed", { exact: true }).first()).toBeVisible();
    await page.reload();
    await page.getByRole("button", { name: "Notification history" }).click();
    await expect(page.getByText("Daily Puppy Gift claimed", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Mark all read" }).click();
    await expect(page.getByText("New", { exact: true })).toHaveCount(0);

    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByRole("button", { name: "Appearance", exact: true }).click();
    await page.getByRole("button", { name: "DARK", exact: true }).click();
    await page.reload();
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByRole("button", { name: "Appearance", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "DARK", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await page.screenshot({
      path: `test-results/kotlin-react-${width}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    expect(errors).toEqual([]);
  });
