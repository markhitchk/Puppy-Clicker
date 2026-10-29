import {test,expect} from "@playwright/test";

test.describe("desktop website game navigation",()=>{
  test.use({viewport:{width:1440,height:900}});

  test("Home is prominent and desktop does not duplicate mobile header actions",async({page})=>{
    await page.goto("/play");
    const sidebar=page.getByTestId("desktop-navigation");
    await expect(sidebar).toBeVisible();
    const home=sidebar.getByRole("navigation",{name:"Game navigation"}).getByRole("link",{name:"Home"});
    await expect(home).toBeVisible();
    const topbar=page.getByTestId("game-top-bar");
    await expect(topbar).toBeVisible();
    await expect(topbar.getByRole("button",{name:/^Notifications/})).toHaveCount(0);
    await expect(topbar.getByRole("button",{name:"Open settings"})).toHaveCount(0);
    await expect(sidebar.getByRole("button",{name:"Settings"})).toBeVisible();
    await home.click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading",{name:/Tap\. Care\. Collect\./})).toBeVisible();
  });
});

test.describe("mobile website game navigation",()=>{
  test.use({viewport:{width:390,height:844}});

  test("retains mobile notification and settings controls",async({page})=>{
    await page.goto("/play");
    await expect(page.getByTestId("desktop-navigation")).toHaveCount(0);
    const topbar=page.getByTestId("game-top-bar");
    await expect(topbar).toBeVisible();
    await expect(topbar.getByRole("button",{name:/^Notifications/})).toBeVisible();
    await expect(topbar.getByRole("button",{name:"Open settings"})).toBeVisible();
  });
});
