import { expect } from "@playwright/test";

// Mirrors Kotlin's Welcome → Player Setup → Personalize → Privacy → Notifications → Ready.
export async function completeOnboarding(page) {
  await expect(page.getByText("SETUP 1 OF 6")).toBeVisible();
  for (let i = 0; i < 3; i++)
    await page.getByRole("button", { name: "Continue ›" }).click();
  await page.getByRole("switch", {
    name: "I have reviewed how the preview handles my data",
  }).click();
  await page.getByRole("button", { name: "Continue ›" }).click();
  await page.getByRole("button", { name: "Ready to Play ›" }).click();
  await page.getByRole("button", { name: "Start Playing 🐾" }).click();
}
