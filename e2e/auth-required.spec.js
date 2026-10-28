import {test,expect} from "@playwright/test";
const relay=async(page)=>{
 await page.route("**/functions/v1/pup-web-discord-relay",async route=>{
  const body=route.request().postDataJSON();
  await route.fulfill({status:200,contentType:"application/json",
   body:JSON.stringify(body.action==="relay-start"?{ok:true,expiresIn:300}:{ready:false})});
 });
};
test("signed-out visitors see Pup Account, not ARC Raiders authentication",async({page})=>{
 await page.goto("/?signedout=1");
 await expect(page.getByRole("button",{name:"Continue with Puppy Clicker Discord"})).toBeVisible();
 await expect(page.getByRole("button",{name:"Sign in to Pup Account"})).toBeVisible();
 await expect(page.getByRole("button",{name:"Tap Buddy to earn Treats"})).toHaveCount(0);
});
test("Android website OAuth uses ONLY the app deep-link and PKCE",async({page})=>{
 await relay(page);
 await page.addInitScript(()=>Object.defineProperty(navigator,"userAgent",{configurable:true,value:"Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36"}));
 await page.route("https://discord.com/oauth2/authorize?**",route=>
  route.fulfill({status:200,contentType:"text/html",body:"<html><body>Puppy Discord OAuth Test</body></html>"}));
 await page.goto("/?signedout=1");
 await page.getByRole("button",{name:"Continue with Puppy Clicker Discord"}).click();
 await expect(page.getByText("Puppy Discord OAuth Test")).toBeVisible();
 const url=new URL(page.url());
 expect(url.origin).toBe("https://discord.com");
 expect(url.searchParams.get("client_id")).toBe("1547982688898777118");
 expect(url.searchParams.get("redirect_uri")).toBe("discord-1547982688898777118:/authorize/callback");
 expect(url.searchParams.get("code_challenge_method")).toBe("S256");
 expect(url.searchParams.get("scope")).toBe("identify");
 expect(url.searchParams.get("state")).toMatch(/^pcw1_[A-Za-z0-9_-]{32,64}$/);
});
test("desktop shows mobile handoff without sending browser to custom URI",async({page})=>{
 await relay(page);
 await page.goto("/?signedout=1");
 await page.getByRole("button",{name:"Continue with Puppy Clicker Discord"}).click();
 const input=page.getByRole("textbox",{name:"Puppy Discord mobile authorization link"});
 await expect(input).toBeVisible();
 const url=new URL(await input.inputValue());
 expect(url.searchParams.get("redirect_uri")).toBe("discord-1547982688898777118:/authorize/callback");
 await expect(page.getByRole("button",{name:"Tap Buddy to earn Treats"})).toHaveCount(0);
});
