import {test,expect} from "@playwright/test";
test("signed-out visitors see Pup Account, not ARC Raiders authentication",async({page})=>{
 await page.goto("/?signedout=1");
 await expect(page.getByRole("button",{name:"Continue with Puppy Clicker Discord"})).toBeVisible();
 await expect(page.getByRole("button",{name:"Sign in to Pup Account"})).toBeVisible();
 await expect(page.getByRole("button",{name:"Tap Buddy to earn Treats"})).toHaveCount(0);
});
test("Discord authorize uses Puppy Clicker app ID, PKCE and website callback",async({page})=>{
 await page.route("https://discord.com/oauth2/authorize?**",route=>
  route.fulfill({status:200,contentType:"text/html",body:"<html><body>Puppy Discord OAuth Test</body></html>"}));
 await page.goto("/?signedout=1");
 await page.getByRole("button",{name:"Continue with Puppy Clicker Discord"}).click();
 await expect(page.getByText("Puppy Discord OAuth Test")).toBeVisible();
 const url=new URL(page.url());
 expect(url.origin).toBe("https://discord.com");
 expect(url.searchParams.get("client_id")).toBe("1547982688898777118");
 expect(url.searchParams.get("redirect_uri")).toBe("https://puppy-clicker.vercel.app/auth/discord/callback");
 expect(url.searchParams.get("code_challenge_method")).toBe("S256");
 expect(url.searchParams.get("scope")).toBe("identify");
 expect(url.searchParams.get("state")?.length).toBeGreaterThan(15);
});
test("Puppy Discord callback rejects missing or mismatched state",async({page})=>{
 await page.goto("/?signedout=1");
 await page.goto("/auth/discord/callback?code=abc12345678&state=malicious");
 await expect(page.getByText(/DISCORD OAUTH STATE MISMATCH/i)).toBeVisible();
 await expect(page.getByRole("button",{name:"Tap Buddy to earn Treats"})).toHaveCount(0);
});
