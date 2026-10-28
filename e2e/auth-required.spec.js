import {test,expect} from "@playwright/test";
test("signed-out visitors must sign in before reaching native game",async({page})=>{
 await page.goto("/?signedout=1");
 await expect(page.getByRole("button",{name:"Continue with Discord"})).toBeVisible();
 await expect(page.getByRole("button",{name:"Sign in"})).toBeVisible();
 await expect(page.getByRole("button",{name:"Tap Buddy to earn Treats"})).toHaveCount(0);
});
