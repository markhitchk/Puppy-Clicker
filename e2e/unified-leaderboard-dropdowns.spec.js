import {test,expect} from "@playwright/test";
test.beforeEach(async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('puppy-clicker:cookie-choice:v1',JSON.stringify({version:1,essential:true,functional:true,analytics:false,advertising:false,savedAt:Date.now()})));
});
for(const width of [360,768,1440]){
 test("unified leaderboard shows all three scores at "+width+"px",async({page})=>{
  await page.setViewportSize({width,height:820});
  await page.route("**/api/leaderboard?**",route=>{
   const url=new URL(route.request().url());
   expect(url.searchParams.get("view")).toBe("unified");
   const metric=url.searchParams.get("metric");
   const row={rank:1,username:"ranked-pup",displayName:"Ranked Pup",scores:{treats:12345,xp:987,puppies:8}};
   return route.fulfill({json:{ok:true,metric,canParticipate:true,participating:true,total:1,top:[row],self:row}});
  });
  await page.goto("/leaderboard");
  const unified=page.locator(".leaderboard-unified");
  await expect(unified).toBeVisible();
  const board=unified.locator(".leaderboard-stat-grid");
  await expect(board.locator("tbody tr")).toHaveCount(1);
  await expect(board.locator("tbody tr .leaderboard-score")).toHaveCount(3);
  await expect(board.locator("tbody tr")).toContainText("12,345");
  await expect(board.locator("tbody tr")).toContainText("987");
  await expect(board.locator("tbody tr")).toContainText("8");
  await unified.getByRole("button",{name:/Player XP/}).click();
  await expect(unified.getByRole("button",{name:/Player XP/})).toHaveAttribute("aria-pressed","true");
  await expect(board.locator("tbody tr .leaderboard-score")).toHaveCount(3);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(2);
 });
}
test("mobile language and privacy selects have consistent accessible styling",async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto("/");
 await page.locator(".site-nav-toggle").click();
 const language=page.locator(".site-nav.is-open select");
 await expect(language).toBeVisible();
 await expect(language).toHaveCSS("min-height","44px");
 await expect(language).toHaveCSS("appearance","none");
 await language.selectOption("es");
 await expect(language).toHaveValue("es");
 await language.selectOption("en");
 await page.goto("/account/privacy");
 const request=page.locator("#privacy-right");
 await expect(request).toHaveCSS("min-height","44px");
 await expect(request).toHaveCSS("appearance","none");
});
