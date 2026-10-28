import {test,expect} from "@playwright/test";
for(const width of [360,768,1280,1920]){
 test("website routes and responsive layout at "+width+"px",async({page})=>{
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
  await expect(page.getByRole("button",{name:"Sign in to Pup Account"})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.getByRole("link",{name:"Account",exact:true}).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("button",{name:"Sign in to Pup Account"})).toBeVisible();
  expect(errors).toEqual([]);
 });
}
