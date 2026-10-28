import { test, expect } from "@playwright/test";
test("signed-out visitors must authenticate before starting or changing gameplay", async ({ page }) => {
  await page.goto("/?signedout=1");
  await expect(page.getByText("SETUP 1 OF 6")).toBeVisible();
  await page.getByRole("button", { name: "Continue ›" }).click();
  await expect(page.getByText("Sign-in is required to continue setup.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in with Discord" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue ›" })).toBeDisabled();
});
