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


test("puppy roster and home showcase use transparent optimized portraits",async({page})=>{
 for(const route of ["/","/puppies"]){
  await page.goto(route);
  const cards=page.locator(".meet-puppy-card");
  const art=cards.locator("img.puppy-artwork");
  const count=await cards.count();
  expect(count).toBeGreaterThan(route==="/puppies"?20:5);
  await expect(art).toHaveCount(count);
  const sources=await art.evaluateAll(nodes=>nodes.map(node=>({
   src:node.getAttribute("src"),set:node.getAttribute("srcset")
  })));
  for(const source of sources){
   expect(source.src).toMatch(/^\/assets\/portraits\/[a-z0-9_-]+-[a-f0-9]{12}-256\.webp$/);
   expect(source.set).toContain("/assets/portraits/");
  }
  const first=art.first();
  await first.scrollIntoViewIfNeeded();
  await expect.poll(()=>first.evaluate(node=>node.complete&&node.naturalWidth>0)).toBe(true);
 }
});


test("Meet the Puppies includes both missing test puppies and their transparent artwork",async({page})=>{
 await page.goto("/puppies");
 await expect(page.getByText("32 of 32 puppies")).toBeVisible();
 await page.getByRole("button",{name:"Test puppies"}).click();
 const cards=page.locator(".meet-puppy-card");
 await expect(cards).toHaveCount(2);
 await expect(page.getByRole("heading",{name:/Crash Test Pup V1/})).toBeVisible();
 await expect(page.getByRole("heading",{name:/Crash Test Pup V2/})).toBeVisible();
 await expect(page.getByText("2 of 32 puppies")).toBeVisible();
 await expect(cards.locator("img.puppy-artwork")).toHaveCount(2);
 const ids=await cards.locator("img.puppy-artwork").evaluateAll(items=>items.map(img=>img.getAttribute("src")));
 expect(ids.some(src=>src.includes("test_v1_crash_dummy"))).toBe(true);
 expect(ids.some(src=>src.includes("test_v2_crash_dummy"))).toBe(true);
 await page.getByRole("button",{name:"V2 puppies"}).click();
 await expect(page.getByRole("heading",{name:/Dev Pup/})).toBeVisible();
 await page.getByRole("button",{name:"Special"}).click();
 await expect(page.getByRole("heading",{name:/Dev Pup/})).toBeVisible();
});
