import {test,expect} from '@playwright/test';

for (const width of [360,390,768,980]) {
 test('home account actions remain distinct and readable at '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:850});
  await page.goto('/');
  const card=page.locator('.split-cta');
  await card.scrollIntoViewIfNeeded();
  const open=card.getByRole('link',{name:'Open Account Management'});
  const create=card.getByRole('link',{name:'Create Pup Account'});
  const recover=card.getByRole('link',{name:'Forgot your login? Recover your Pup Account'});
  await expect(open).toBeVisible();await expect(create).toBeVisible();await expect(recover).toBeVisible();
  const boxes=await Promise.all([open,create,recover].map(x=>x.boundingBox()));
  for(const b of boxes){expect(b.width).toBeGreaterThan(80);expect(b.x).toBeGreaterThanOrEqual(-1);expect(b.x+b.width).toBeLessThanOrEqual(width+1);}
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
   const [a,b]=[boxes[i],boxes[j]];
   const overlapX=Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x));
   const overlapY=Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));
   expect(overlapX*overlapY).toBeLessThanOrEqual(1);
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 });
}
