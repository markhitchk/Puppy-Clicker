import {test,expect} from "@playwright/test";

for(const width of [360,390,768,1024,1279]){
 test("site header drawer is usable with no overlap at "+width+"px",async({page})=>{
  await page.setViewportSize({width,height:844});
  await page.goto("/");
  const nav=page.getByRole("navigation",{name:"Website"});
  const open=page.getByRole("button",{name:"Open navigation menu"});
  await expect(open).toBeVisible();
  await expect(nav).toBeHidden();
  const header=page.locator(".site-header");
  const brand=header.locator(".site-brand");
  const tools=header.locator(".site-header-tools");
  const boxes=await Promise.all([brand.boundingBox(),tools.boundingBox()]);
  expect(boxes[0].x+boxes[0].width).toBeLessThanOrEqual(boxes[1].x+1);
  await expect(page.locator("html")).toHaveAttribute("lang",/en|es/);
  await open.click();
  await expect(nav).toBeVisible();
  await expect(nav.getByRole("link",{name:"🏆 Leaderboard"})).toBeVisible();
  await expect(nav.getByRole("link",{name:"💬 Community chat"})).toBeVisible();
  await expect(nav.getByLabel("Choose language")).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
  await page.keyboard.press("Escape");
  await expect(nav).toBeHidden();
  await expect(open).toBeFocused();
  await open.click();
  await nav.getByRole("link",{name:"🏆 Leaderboard"}).click();
  await expect(page).toHaveURL(/\/leaderboard$/);
  await expect(page.getByRole("navigation",{name:"Website"})).toBeHidden();
 });
}

for(const width of [1280,1440,1920]){
 test("desktop header keeps links, account and language on one row at "+width+"px",async({page})=>{
  await page.setViewportSize({width,height:900});
  await page.goto("/");
  const header=page.locator(".site-header");
  const nav=page.getByRole("navigation",{name:"Website"});
  await expect(nav).toBeVisible();
  await expect(page.getByRole("button",{name:"Open navigation menu"})).toBeHidden();
  await expect(nav.getByRole("link",{name:"🏆 Leaderboard"})).toBeVisible();
  await expect(nav.getByRole("link",{name:"💬 Community chat"})).toBeVisible();
  await expect(nav.getByLabel("Choose language")).toBeVisible();
  const bounds=await Promise.all([
   header.locator(".site-brand").boundingBox(),
   nav.boundingBox(),
   header.locator(".site-header-tools").boundingBox()
  ]);
  expect(bounds[0].x+bounds[0].width).toBeLessThanOrEqual(bounds[1].x+1);
  expect(bounds[1].x+bounds[1].width).toBeLessThanOrEqual(bounds[2].x+1);
  expect(Math.abs(bounds[0].y-bounds[1].y)).toBeLessThanOrEqual(40);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 });
}

test("language switch relabels mobile menu without closing it",async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto("/");
 await page.getByRole("button",{name:"Open navigation menu"}).click();
 const nav=page.getByRole("navigation",{name:"Website"});
 await nav.getByLabel("Choose language").selectOption("es");
 await expect(nav.getByRole("link",{name:"🏆 Clasificación"})).toBeVisible();
 await expect(page.getByRole("button",{name:"Cerrar menú de navegación"})).toBeVisible();
 await page.getByRole("button",{name:"Cerrar menú de navegación"}).click();
 await expect(nav).toBeHidden();
});
