import {test,expect} from "@playwright/test";

test("the exact /play?=demo URL is playable without Pup Account login",async({page})=>{
 await page.goto("/play?=demo");
 await expect(page).toHaveURL(/\/play\?=demo$/);
 await expect(page.getByRole("heading",{name:"Puppy Clicker · Play Demo"})).toBeVisible();
 await expect(page.locator('[data-testid="home-play-demo"]')).toBeVisible();
 await expect(page.getByRole("button",{name:"Sign in to Pup Account"})).toHaveCount(0);
 const treats=page.locator(".home-play-demo__wallet-item").first().locator("strong");
 await expect(treats).toHaveText("20");
 await page.getByRole("button",{name:/Tap Buddy to earn \d+ demo Treats/}).click();
 await expect(treats).toHaveText("22");
 await page.getByRole("button",{name:"Play with Sunny"}).click();
 await expect(page.locator(".home-play-demo__name")).toContainText("Sunny");
 await page.getByRole("button",{name:/Reset demo/}).click();
 await expect(treats).toHaveText("20");
 await expect(page.locator(".home-play-demo__name")).toContainText("Buddy");
});

test("the homepage links directly to the dedicated demo but /play remains account-gated",async({page})=>{
 await page.goto("/");
 await page.getByRole("link",{name:"🎮 Try Demo"}).click();
 await expect(page).toHaveURL(/\/play\?=demo$/);
 await expect(page.getByRole("heading",{name:"Puppy Clicker · Play Demo"})).toBeVisible();
 await page.getByRole("link",{name:/Play the full game/}).click();
 await expect(page).toHaveURL(/\/play$/);
 await expect(page.getByRole("button",{name:"Sign in to Pup Account"})).toBeVisible();
});
