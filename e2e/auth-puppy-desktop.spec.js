import {test,expect} from "@playwright/test";

const discordIcon="https://www.svgrepo.com/show/353655/discord-icon.svg";

test.describe("desktop website Pup Account pages",()=>{
 test.use({viewport:{width:1440,height:900}});

 test("shows sign-in as a full page instead of a narrow modal",async({page})=>{
  await page.goto("/account?signedout");
  const auth=page.getByTestId("pup-auth-page");
  await expect(auth).toBeVisible();
  await expect(page.getByRole("complementary",{name:"Welcome to Pup Account"})).toBeVisible();
  const form=page.getByTestId("pup-auth-form");
  await expect(form).toBeVisible();
  await expect(form.getByRole("tab",{name:"Sign In"})).toBeVisible();
  await expect(form.locator('img[src="'+discordIcon+'"]')).toHaveCount(1);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const bounds=await form.boundingBox();
  expect(bounds?.width).toBeGreaterThan(500);
 });

 test("uses the Discord SVG in the registration page and keeps legal consent",async({page})=>{
  await page.goto("/account?mode=register&signedout");
  const form=page.getByTestId("pup-auth-form");
  await expect(form.getByRole("tab",{name:"Create Account"})).toHaveAttribute("aria-selected","true");
  await expect(form.locator('img[src="'+discordIcon+'"]')).toHaveCount(2);
  await expect(form.getByRole("checkbox")).toHaveCount(2);
  await expect(form.getByRole("button",{name:/Register with Discord/})).toBeVisible();
 });
});

test.describe("public puppy detail links",()=>{
 test("fills the desktop viewport and keeps deep links functional",async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await page.goto("/puppies?pup=v1_golden");
  const dialog=page.getByRole("dialog",{name:"Puppy Details"});
  await expect(dialog).toBeVisible();
  const bounds=await dialog.boundingBox();
  expect(bounds?.width).toBeGreaterThanOrEqual(1430);
  expect(bounds?.height).toBeGreaterThanOrEqual(890);
  await expect(dialog.getByText("v1_golden")).toBeVisible();
  await dialog.getByRole("button",{name:"Close puppy details"}).click();
  await expect(page).toHaveURL(/\/puppies\/?$/);
 });

 test("retains compact details on a mobile viewport",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto("/puppies?pup=v1_golden");
  const dialog=page.getByRole("dialog",{name:"Puppy Details"});
  await expect(dialog).toBeVisible();
  const bounds=await dialog.boundingBox();
  expect(bounds?.width).toBeLessThan(390);
 });
});
