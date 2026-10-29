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


for (const width of [320,360,390,768,1024,1440]) {
 test('signed-in account controls and password form fit at '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:850});
  await page.goto('/account');
  const controls=page.locator('.account-management-actions');
  const accountCard=page.locator('.account-management-card');
  await expect(accountCard).toBeVisible();
  const buttons=[
   controls.getByRole('link',{name:'Account recovery'}),
   controls.getByRole('button',{name:'Refresh account details'}),
   controls.getByRole('button',{name:'Sign out'})
  ];
  await expect(controls).toHaveCSS('display','grid');
  const boxes=await Promise.all(buttons.map(x=>x.boundingBox()));
  const card=await accountCard.boundingBox();
  for(let i=0;i<boxes.length;i++){
   const b=boxes[i];
   expect(b.width).toBeGreaterThan(100);
   expect(b.x).toBeGreaterThanOrEqual(card.x-1);
   expect(b.x+b.width).toBeLessThanOrEqual(card.x+card.width+1);
   if(i>0)expect(b.y-(boxes[i-1].y+boxes[i-1].height)).toBeGreaterThanOrEqual(10);
  }
  expect(Math.max(...boxes.map(b=>b.width))-Math.min(...boxes.map(b=>b.width))).toBeLessThanOrEqual(2);
  const passwordButton=page.getByRole('button',{name:/Update password login|Enable password login/});
  const form=page.locator('.account-credentials');
  const formBox=await form.boundingBox(),submitBox=await passwordButton.boundingBox();
  expect(submitBox.width).toBeGreaterThan(100);
  expect(submitBox.x).toBeGreaterThanOrEqual(formBox.x-1);
  expect(submitBox.x+submitBox.width).toBeLessThanOrEqual(formBox.x+formBox.width+1);
  const profileRow=page.locator('.profile-row').first();
  const edit=profileRow.getByRole('button',{name:'Edit name'});
  await expect(edit).toBeVisible();
  const rowBox=await profileRow.boundingBox(),editBox=await edit.boundingBox();
  expect(editBox.width).toBeLessThanOrEqual(Math.max(170,rowBox.width/2));
  expect(editBox.x+editBox.width).toBeLessThanOrEqual(rowBox.x+rowBox.width+1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 });
}
test('homepage account actions use separate grouped links on desktop and mobile',async({page})=>{
 for(const width of [360,1440]){
  await page.setViewportSize({width,height:900});
  await page.goto('/');
  const group=page.locator('.home-account-actions');
  await expect(group.getByRole('link',{name:'Open Account Management'})).toBeVisible();
  await expect(group.getByRole('link',{name:'Create Pup Account'})).toBeVisible();
  const recovery=page.locator('.home-account-recovery');
  await expect(recovery).toBeVisible();
  const r=await recovery.boundingBox();
  for(const link of await group.getByRole('link').all()){
   const b=await link.boundingBox();
   expect(r.y).toBeGreaterThanOrEqual(b.y+b.height+8);
  }
  if(width===360)await expect(group).toHaveCSS('flex-direction','column');
  else await expect(group).toHaveCSS('flex-direction','row');
 }
});
