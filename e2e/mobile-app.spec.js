import {test,expect} from "@playwright/test";
const begin=async(page,width)=>{
 page.on("console",message=>{if(message.type()==="error")console.log("BROWSER_CONSOLE",message.text());});
 page.on("pageerror",error=>console.log("BROWSER_PAGE_ERROR",error.stack||error.message));
 await page.setViewportSize({width,height:850});
 await page.goto("/");
 await expect(page.getByText("Puppy Clicker",{exact:true}).first()).toBeVisible();
};
for(const width of [360,768,1280]){
 test("native Puppy Clicker React screens at "+width+"px",async({page})=>{
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await begin(page,width);
  await expect(page.getByRole("button",{name:"Tap Buddy to earn Treats"})).toBeVisible();
  await page.getByRole("button",{name:"Tap Buddy to earn Treats"}).first().click();
  await expect(page.getByText("1",{exact:true}).first()).toBeVisible();
  if(width>=1000){
   await expect(page.getByRole("button",{name:"Casino"})).toBeVisible();
   await expect(page.getByRole("button",{name:"Exchange"})).toBeVisible();
   await expect(page.getByText("Player overview")).toBeVisible();
  }else{
   await expect(page.getByRole("tab",{name:"Roster"})).toBeVisible();
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(errors).toEqual([]);
 });
}
test("casino, roster, care and settings use the native screens",async({page})=>{
 await begin(page,1280);
 await page.getByRole("button",{name:"Casino"}).click();
 await expect(page.getByText("Puppy Casino").first()).toBeVisible();
 await page.getByRole("button",{name:"Roster"}).click();
 await expect(page.getByText("Puppy Roster").first()).toBeVisible();
 await page.getByRole("button",{name:"Care"}).click();
 await expect(page.getByText("Pup Care").first()).toBeVisible();
 await page.getByRole("button",{name:"Settings"}).click();
 await expect(page.getByText("Settings").first()).toBeVisible();
});
test("website requires authentication; never opens guest gameplay",async({page})=>{
 await page.goto("/?signedout=1");
 await expect(page.getByRole("button",{name:"Continue with Discord"})).toBeVisible();
 await expect(page.getByRole("button",{name:"Sign in"})).toBeVisible();
 await expect(page.getByRole("button",{name:"Tap Buddy to earn Treats"})).toHaveCount(0);
});
