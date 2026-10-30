import {test,expect} from "@playwright/test";

test("signed-out visitors can play /play?=demo without Pup Account login",async({page})=>{
 // The fixture's signedout flag simulates a visitor without a Supabase session.
 await page.goto("/play?=demo&signedout=1");
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

test("homepage has no embedded demo, but signed-out visitors see the demo link",async({page})=>{
 await page.goto("/?signedout=1");
 await expect(page.locator('[data-testid="home-play-demo"]')).toHaveCount(0);
 await expect(page.getByRole("link",{name:"🎮 Try Demo"})).toBeVisible();
 await expect(page.getByRole("link",{name:"🎮 Try Demo"})).toHaveAttribute("href","/play?=demo");
 await expect(page.getByRole("heading",{name:"Try Puppy Clicker right here"})).toHaveCount(0);
});

test("signed-in visitors never see the demo and are redirected to protected /play",async({page})=>{
 await page.goto("/");
 await expect(page.locator('[data-testid="home-play-demo"]')).toHaveCount(0);
 await expect(page.getByRole("link",{name:"🎮 Try Demo"})).toHaveCount(0);
 await page.goto("/play?=demo");
 await expect(page).toHaveURL(/\/play$/);
 await expect(page.locator('[data-testid="home-play-demo"]')).toHaveCount(0);
 await expect(page.getByTestId("play-viewport")).toBeVisible();
});

test("signed-out /play without the demo query remains account-gated",async({page})=>{
 await page.goto("/play?signedout=1");
 await expect(page.getByRole("button",{name:"Sign in to Pup Account"})).toBeVisible();
 await expect(page.locator('[data-testid="home-play-demo"]')).toHaveCount(0);
});
