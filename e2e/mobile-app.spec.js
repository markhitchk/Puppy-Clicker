import {test,expect} from "@playwright/test";
for(const width of [360,768,1280,1920]){
 test("website routes and distinct game layouts at "+width+"px",async({page})=>{
  const errors=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.setViewportSize({width,height:850});
  await page.goto("/");
  await expect(page.getByRole("heading",{name:/Tap. Care. Collect./})).toBeVisible();
  await expect(page.getByRole("navigation",{name:"Website"})).toBeVisible();
  await expect(page.getByRole("link",{name:"Home",exact:true})).toBeVisible();
  await expect(page.getByRole("link",{name:"🐾 Play",exact:true})).toBeVisible();
  await expect(page.getByRole("link",{name:"Account",exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.getByRole("link",{name:"🐾 Play",exact:true}).click();
  await expect(page).toHaveURL(/\/play$/);
  await expect(page.getByRole("button",{name:"Tap Buddy to earn Treats"})).toBeVisible();
  if(width>=1000){
   await page.getByText("More game modes",{exact:true}).click();
   await expect(page.getByRole("button",{name:"Casino",exact:true})).toBeVisible();
   await expect(page.getByRole("heading",{name:"Pup Care Status",exact:true})).toBeVisible();
   await expect(page.getByRole("button",{name:"🎁 Rewards & daily goals"})).toBeVisible();
  }else{
   await expect(page.getByRole("tab",{name:"🐾 Play"})).toBeVisible();
   await expect(page.getByRole("button",{name:"🎁 Rewards & daily goals"})).toHaveCount(0);
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.getByRole("link",{name:"Account",exact:true}).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("heading",{name:"Your account"})).toBeVisible();
  await expect(page.getByText("Cloud backup found")).toBeVisible();
  await expect(page.getByRole("button",{name:"Edit name"})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  expect(errors).toEqual([]);
 });
}
test("account display name is editable with authenticated Pup Account",async({page})=>{
 await page.goto("/account");
 await page.getByRole("button",{name:"Edit name"}).click();
 await page.getByLabel("Display name").fill("Puppy Tester");
 await page.getByRole("button",{name:"Save display name"}).click();
 await expect(page.getByText("Display name saved to your Pup Account.")).toBeVisible();
 await expect(page.getByRole("heading",{name:"Puppy Tester"})).toBeVisible();
});

test("verified web Pup Account opens Puppy Exchange without Android native signing",async({page})=>{
 await page.setViewportSize({width:1280,height:850});
 await page.goto("/play");
 await page.getByText("More game modes",{exact:true}).click();
 await page.getByRole("button",{name:"Exchange",exact:true}).click();
 await expect(page.getByText("🎁 Puppy Exchange")).toBeVisible();
 await expect(page.getByText("PUP-TEST-WEBB-GAME")).toBeVisible();
 await expect(page.getByText("Verify or reconnect your Pup Account before using Puppy Exchange.")).toHaveCount(0);
});
