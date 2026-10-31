import {test,expect} from "@playwright/test";

test.describe("verified Pup Account site navigation",()=>{
 test.use({viewport:{width:1440,height:900}});

 test("shows the verified identity and an accessible dropdown with profile and settings",async({page})=>{
  await page.goto("/");
  const menu=page.getByTestId("site-account").first();
  const trigger=menu.getByRole("button",{name:"Account menu for Test Player"});
  await expect(trigger).toBeVisible();
  await expect(trigger).toContainText("Test Player");
  await expect(trigger).toContainText("@TestPlayer");
  await expect(menu.getByRole("img",{name:"Profile avatar for Test Player"})).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded","false");
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded","true");
  const dropdown=menu.getByTestId("site-account-dropdown");
  await expect(dropdown).toBeVisible();
  await expect(dropdown.getByRole("link",{name:/View full profile/})).toHaveAttribute("href","/account");
  await expect(dropdown.getByRole("link",{name:/Edit display name/})).toHaveAttribute("href","/account#profile-settings");
  await expect(dropdown.getByRole("link",{name:/Login & security/})).toHaveAttribute("href","/account#account-security");
  await expect(dropdown.getByRole("link",{name:/Account settings/})).toHaveAttribute("href","/account#account-management");
  await expect(dropdown.getByRole("link",{name:/Administration/})).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(dropdown).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.getByRole("heading",{name:/Tap\. Care\. Collect\./}).click();
  await expect(dropdown).toHaveCount(0);
 });

 test("opens the full account view with user avatar and profile sections",async({page})=>{
  await page.goto("/");
  const trigger=page.getByTestId("site-account").first().getByRole("button",{name:"Account menu for Test Player"});
  await trigger.click();
  await page.getByTestId("site-account-dropdown").getByRole("link",{name:/View full profile/}).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("heading",{name:"Your account"})).toBeVisible();
  await expect(page.getByRole("img",{name:"Profile avatar for Test Player"}).last()).toBeVisible();
  await expect(page.locator("#profile-settings")).toBeVisible();
  await expect(page.locator("#account-security")).toBeVisible();
  await expect(page.locator("#account-management")).toBeVisible();
 });

 test("uses a plain Account link when there is no verified Pup Account",async({page})=>{
  await page.goto("/?signedout");
  await expect(page.locator(".site-header-tools").getByRole("link",{name:"Account"})).toBeVisible();
  await expect(page.getByTestId("site-account")).toHaveCount(0);
 });

 test("keeps a profile control in the desktop game sidebar",async({page})=>{
  await page.goto("/play");
  const sidebar=page.getByTestId("desktop-navigation");
  await expect(sidebar).toBeVisible();
  const profile=sidebar.getByTestId("site-account");
  await expect(profile.getByRole("button",{name:"Account menu for Test Player"})).toBeVisible();
  await profile.getByRole("button",{name:"Account menu for Test Player"}).click();
  await expect(profile.getByTestId("site-account-dropdown")).toBeVisible();
  await expect(profile.getByRole("link",{name:/View full profile/})).toBeVisible();
 });
});

test("mobile site header shows a tappable avatar without horizontal overflow",async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto("/");
 const menu=page.getByTestId("site-account").first();
 const trigger=menu.getByRole("button",{name:"Account menu for Test Player"});
 await expect(trigger).toBeVisible();
 const bounds=await trigger.boundingBox();
 expect(bounds?.x).toBeGreaterThanOrEqual(0);
 expect((bounds?.x||0)+(bounds?.width||0)).toBeLessThanOrEqual(390);
 await trigger.click();
 await expect(menu.getByTestId("site-account-dropdown")).toBeVisible();
});
