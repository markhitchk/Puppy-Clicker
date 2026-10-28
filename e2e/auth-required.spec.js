import {test,expect} from "@playwright/test";

async function mockDiscordAuthorization(page){
 await page.route("https://discord.com/oauth2/authorize?**",route=>
  route.fulfill({status:200,contentType:"text/html",
   body:"<html><body>Puppy Discord OAuth Test</body></html>"}));
}
test("signed-out visitors see Pup Account, not ARC Raiders authentication",async({page})=>{
 await page.goto("/?signedout=1");
 await expect(page.getByRole("button",{name:"Continue with Puppy Clicker Discord"})).toBeVisible();
 await expect(page.getByRole("button",{name:"Sign in to Pup Account"})).toBeVisible();
 await expect(page.getByRole("button",{name:"Tap Buddy to earn Treats"})).toHaveCount(0);
});
test("Android browser OAuth uses Puppy Clicker HTTPS callback and PKCE",async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(navigator,"userAgent",
  {configurable:true,value:"Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36"}));
 await mockDiscordAuthorization(page);
 await page.goto("/?signedout=1");
 const origin=new URL(page.url()).origin;
 await page.getByRole("button",{name:"Continue with Puppy Clicker Discord"}).click();
 await expect(page.getByText("Puppy Discord OAuth Test")).toBeVisible();
 const url=new URL(page.url());
 expect(url.origin).toBe("https://discord.com");
 expect(url.searchParams.get("client_id")).toBe("1547982688898777118");
 expect(url.searchParams.get("redirect_uri")).toBe(origin+"/auth/discord/callback");
 expect(url.searchParams.get("code_challenge_method")).toBe("S256");
 expect(url.searchParams.get("scope")).toBe("identify");
 expect(url.searchParams.get("state")).toMatch(/^pcw1_[A-Za-z0-9_-]{32,64}$/);
});
test("desktop signs into the website directly without Android mobile handoff",async({page})=>{
 await mockDiscordAuthorization(page);
 await page.goto("/?signedout=1");
 const origin=new URL(page.url()).origin;
 await page.getByRole("button",{name:"Continue with Puppy Clicker Discord"}).click();
 await expect(page.getByText("Puppy Discord OAuth Test")).toBeVisible();
 const url=new URL(page.url());
 expect(url.searchParams.get("redirect_uri")).toBe(origin+"/auth/discord/callback");
 expect(url.searchParams.get("redirect_uri")).not.toMatch(/^discord-/);
});
