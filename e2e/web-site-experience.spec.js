import {test,expect} from "@playwright/test";

test("homepage introduces puppies from the real roster",async({page})=>{
 await page.goto("/");
 await expect(page.getByRole("heading",{name:"Meet the puppies"})).toBeVisible();
 await expect(page.getByRole("heading",{name:/Buddy/}).first()).toBeVisible();
 await page.getByRole("link",{name:/See the full puppy roster/}).click();
 await expect(page).toHaveURL(/\/puppies$/);
 await expect(page.getByRole("heading",{name:"Meet the Puppy Clicker roster"})).toBeVisible();
});

test("public full roster supports filtering and searching without signing in",async({page})=>{
 await page.goto("/puppies");
 await expect(page.getByText(/of \d+ puppies/)).toBeVisible();
 await page.getByRole("button",{name:"V2 puppies"}).click();
 await expect(page.getByRole("heading",{name:/Frost/})).toBeVisible();
 await expect(page.getByRole("heading",{name:/Buddy/})).toHaveCount(0);
 await page.getByRole("button",{name:"All puppies"}).click();
 await page.getByRole("searchbox",{name:"Search puppies"}).fill("Mochi");
 await expect(page.getByRole("heading",{name:/Mochi/})).toBeVisible();
 await expect(page.getByRole("heading",{name:/Sunny/})).toHaveCount(0);
});

test("unknown paths show a 404 screen rather than the homepage or game",async({page})=>{
 await page.goto("/does-not-exist");
 await expect(page.getByRole("heading",{name:"Page not found"})).toBeVisible();
 await expect(page.getByLabel("Error 404")).toBeVisible();
 await expect(page.getByRole("link",{name:/Back to Home/})).toBeVisible();
 await expect(page.getByRole("heading",{name:/Tap. Care. Collect./})).toHaveCount(0);
});

test("friendly error routes render their own codes and recovery links",async({page})=>{
 for(const code of [400,401,403,429,500,503]){
  await page.goto("/error/"+code);
  await expect(page.getByLabel("Error "+code)).toBeVisible();
  await expect(page.getByRole("link",{name:"Pup Account"})).toBeVisible();
 }
});

test("account login exposes username and current-password autofill fields",async({page})=>{
 await page.goto("/account?signedout=1");
 const username=page.locator('input[name="username"][autocomplete="username"]');
 const password=page.locator('input[name="password"][autocomplete="current-password"]');
 await expect(username).toBeVisible();
 await expect(password).toBeVisible();
 await username.fill("PupPlayer");
 await password.fill("example-only-no-login");
 await expect(page.getByRole("button",{name:"Sign in to Pup Account"})).toBeEnabled();
 await page.getByRole("tab",{name:"Create Account"}).click();
 await expect(page.locator('input[name="new-password"][autocomplete="new-password"]')).toBeVisible();
});

test("legacy register bookmarks show the registration tab within /account",async({page})=>{
 await page.goto("/register?signedout=1");
 await expect(page).toHaveURL(/\/account\?.*mode=register/);
 await expect(page.getByRole("tab",{name:"Create Account"})).toHaveAttribute("aria-selected","true");
});
