import {test,expect} from "@playwright/test";

test.beforeEach(async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('puppy-clicker:cookie-choice:v1',JSON.stringify({version:1,essential:true,functional:true,analytics:false,advertising:false,savedAt:Date.now()})));
});
async function expectButtonSurface(locator){
 await expect(locator).toBeVisible();
 await expect(locator).toHaveCSS("text-decoration-line","none");
 await expect(locator).toHaveCSS("border-top-style","solid");
 const style=await locator.evaluate(el=>{
  const cs=getComputedStyle(el);
  return {border:parseFloat(cs.borderTopWidth),borderColor:cs.borderTopColor,bg:cs.backgroundColor,height:el.getBoundingClientRect().height};
 });
 expect(style.border).toBeGreaterThan(0);
 expect(style.borderColor).not.toMatch(/^rgba\(.*,[ ]*0\)$/);
 expect(style.bg).not.toBe("rgba(0, 0, 0, 0)");
 expect(style.height).toBeGreaterThanOrEqual(44);
}
for(const width of [360,390,768]){
 test("mobile header and profile use actual compact buttons at "+width+"px",async({page})=>{
  await page.setViewportSize({width,height:740});
  await page.goto("/account");
  await page.locator(".site-nav-toggle").click();
  const nav=page.locator(".site-nav.is-open");
  await expect(nav).toBeVisible();
  for(const link of await nav.locator("a:visible").all())await expectButtonSurface(link);
  const navBox=await nav.boundingBox();
  expect(navBox.x).toBeGreaterThanOrEqual(0);
  expect(navBox.x+navBox.width).toBeLessThanOrEqual(width+1);
  await page.locator(".site-nav-toggle").click();
  await page.locator(".site-header-tools .site-account-trigger").click();
  const profile=page.getByTestId("site-account-dropdown");
  const links=profile.locator(".site-account-dropdown-links");
  await expect(links).toHaveCSS("display","grid");
  for(const link of await links.locator("a").all())await expectButtonSurface(link);
  await expectButtonSurface(profile.getByRole("button",{name:"Sign out"}));
  const box=await profile.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x+box.width).toBeLessThanOrEqual(width+1);
  expect(box.height).toBeLessThanOrEqual(442);
  expect(box.y+box.height).toBeLessThanOrEqual(740);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(2);
 });
}
for(const width of [360,390,1440]){
 test("credential generators are non-underlined buttons at "+width+"px",async({page})=>{
  await page.setViewportSize({width,height:850});
  await page.goto("/account");
  const form=page.locator(".account-credentials");
  for(const name of [/Generate username/,/Generate strong password/]){
   await expectButtonSurface(form.getByRole("button",{name}));
  }
 });
}
