import {test,expect} from "@playwright/test";

test("cookie banner honors necessary-only and keeps encrypted account data untouched",async({page})=>{
 await page.goto("/settings");
 const banner=page.getByRole("complementary",{name:"Your privacy, your choice"});
 await expect(banner).toBeVisible();
 await banner.getByRole("button",{name:"Necessary only"}).click();
 await expect(banner).toHaveCount(0);
 const selected=await page.evaluate(()=>{
  const c=JSON.parse(localStorage.getItem("puppy-clicker:cookie-choice:v1"));
  return {choice:c,prefs:localStorage.getItem("puppy-clicker:web-preferences:v1")};
 });
 expect(selected.choice.functional).toBe(false);
 expect(selected.choice.analytics).toBe(false);
 expect(selected.choice.advertising).toBe(false);
 expect(selected.prefs).toBeNull();
 await page.reload();
 await expect(banner).toHaveCount(0);
 await page.getByTestId("cookie-privacy-settings").getByRole("button",{name:"Change cookie choices"}).click();
 const dialog=page.getByRole("dialog",{name:"Cookies & website storage"});
 await expect(dialog).toBeVisible();
 await dialog.getByRole("switch",{name:"Remember browser customization"}).check();
 await dialog.getByRole("button",{name:"Save choices"}).click();
 await expect(dialog).toHaveCount(0);
 const allowed=await page.evaluate(()=>JSON.parse(localStorage.getItem("puppy-clicker:cookie-choice:v1")).functional);
 expect(allowed).toBe(true);
});

test("cookie controls can clear selected local data without wiping other game records",async({page})=>{
 await page.goto("/settings");
 await page.getByRole("button",{name:"Allow customization"}).click();
 await page.evaluate(()=>{
  localStorage.setItem("puppy-clicker-notification-ui:v1:11111111-1111-4111-a111-111111111111",JSON.stringify({version:1,read:["seen"],hidden:[]}));
  localStorage.setItem("puppy-test-do-not-clear","KEEP_GAME");
 });
 const panel=page.getByTestId("cookie-privacy-settings");
 await panel.getByLabel("Notification read / hidden display state").check();
 await panel.getByRole("button",{name:"Clear selected data"}).click();
 await panel.getByRole("button",{name:"Confirm and clear"}).click();
 await expect(panel.getByRole("status")).toContainText("Selected local data cleared");
 const result=await page.evaluate(()=>({
  notification:localStorage.getItem("puppy-clicker-notification-ui:v1:11111111-1111-4111-a111-111111111111"),
  gameplay:localStorage.getItem("puppy-test-do-not-clear"),
  consent:localStorage.getItem("puppy-clicker:cookie-choice:v1")
 }));
 expect(result.notification).toBeNull();
 expect(result.gameplay).toBe("KEEP_GAME");
 expect(result.consent).toBeTruthy();
});

test("cookie banner and preferences remain within narrow mobile viewport",async({page})=>{
 await page.setViewportSize({width:360,height:740});
 await page.goto("/");
 await expect(page.getByRole("complementary",{name:"Your privacy, your choice"})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.getByRole("button",{name:"Manage choices"}).click();
 const dialog=page.getByRole("dialog",{name:"Cookies & website storage"});
 await expect(dialog).toBeVisible();
 const dimensions=await dialog.boundingBox();
 expect(dimensions?.width).toBeLessThanOrEqual(360);
 await dialog.getByRole("button",{name:"Necessary only"}).click();
 await expect(dialog).toHaveCount(0);
});

for(const width of [360,390,1440]){
 test("privacy notice cookie action aligns with policy buttons at "+width+"px",async({page})=>{
  await page.setViewportSize({width,height:850});
  await page.addInitScript(()=>localStorage.setItem("puppy-clicker:cookie-choice:v1",JSON.stringify({version:1,essential:true,functional:false,analytics:false,advertising:false,savedAt:Date.now()})));
  await page.goto("/account/privacy");
  const nav=page.getByRole("navigation",{name:"Privacy navigation"});
  const cookie=nav.getByRole("button",{name:"Manage cookie choices"});
  await expect(cookie).toBeVisible();
  await expect(nav.getByRole("link")).toHaveCount(5);
  const actions=await nav.locator(":scope > a, :scope > button").evaluateAll(els=>els.map(el=>{
   const r=el.getBoundingClientRect(),s=getComputedStyle(el);
   return {x:r.x,y:r.y,width:r.width,height:r.height,radius:s.borderTopLeftRadius};
  }));
  expect(actions).toHaveLength(6);
  for(let i=0;i<actions.length;i++){
   expect(Math.abs(actions[i].width-actions[0].width)).toBeLessThanOrEqual(1);
   expect(Math.abs(actions[i].x-actions[0].x)).toBeLessThanOrEqual(1);
   expect(actions[i].radius).toBe(actions[0].radius);
   expect(actions[i].height).toBeGreaterThanOrEqual(44);
   if(i)expect(actions[i].y-actions[i-1].y-actions[i-1].height).toBeGreaterThanOrEqual(9);
  }
  await cookie.click();
  await expect(page.getByRole("dialog",{name:"Cookies & website storage"})).toBeVisible();
 });
}
