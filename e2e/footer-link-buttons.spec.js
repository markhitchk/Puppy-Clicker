import {test,expect} from '@playwright/test';

const cases=[
 {path:'/privacy',name:'website privacy',selector:'.website-privacy-actions a',count:5},
 {path:'/legal/privacy',name:'privacy policy',selector:'.legal-document-actions .pup-link-button',count:3},
 {path:'/legal/terms',name:'terms',selector:'.legal-document-actions .pup-link-button',count:3},
 {path:'/account/privacy?signedout=1',name:'privacy center',selector:'.privacy-links a.pup-link-button',count:5}
];
for(const width of [360,390,768]){
 for(const view of cases){
  test(view.name+' button links fit at '+width+'px',async({page})=>{
   await page.setViewportSize({width,height:800});
   await page.goto(view.path);
   const controls=page.locator(view.selector);
   await expect(controls).toHaveCount(view.count);
   for(const element of await controls.all()){
    const rect=await element.boundingBox();
    expect(rect,'missing visible action '+view.path).not.toBeNull();
    expect(rect.height,'action must be touch friendly').toBeGreaterThanOrEqual(32);
    expect(rect.width).toBeGreaterThan(45);
    expect(rect.x,'button left overflow').toBeGreaterThanOrEqual(-1);
    expect(rect.x+rect.width,'button right overflow').toBeLessThanOrEqual(width+1);
    expect(await element.evaluate(node=>getComputedStyle(node).textDecorationLine)).toBe('none');
   }
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'page overflow').toBe(true);
  });
 }
}
for(const width of [320,360,390,768,1440]){
 test('traditional logo footer uses plain text links and fits '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:850});
  await page.goto('/');
  const footer=page.locator('.site-footer');
  await expect(footer).toBeVisible();
  const marks=footer.locator('.site-footer-brandmark');
  await expect(marks).toHaveCount(3);
  const logos=[
   ['harleys_studios.png',"Harley's Studios logo"],
   ['puppy_clicker.png','Puppy Clicker game logo'],
   ['PupEye.png','PupEye anti-cheat logo']
  ];
  for(let i=0;i<logos.length;i++){
   const img=marks.nth(i).locator('img');
   await expect(img).toHaveAttribute('src','/assets/logos/'+logos[i][0]);
   await expect(img).toHaveAttribute('alt',logos[i][1]);
   await img.scrollIntoViewIfNeeded();
   await expect.poll(()=>img.evaluate(node=>node.complete&&node.naturalWidth>0)).toBe(true);
   const rect=await img.boundingBox();
   expect(rect.x).toBeGreaterThanOrEqual(-1);
   expect(rect.x+rect.width).toBeLessThanOrEqual(width+1);
  }
  await expect(footer.getByRole('button')).toHaveCount(0);
  const links=footer.locator('.site-footer-links a');
  await expect(links).toHaveCount(6);
  for(const destination of ['/legal/privacy','/legal/terms','/privacy','/account/privacy','/pupeye','mailto:harleytg.hq@gmail.com']){
   await expect(links.locator('[href="'+destination+'"]')).toHaveCount(1);
  }
  const styles=await links.first().evaluate(node=>{
   const c=getComputedStyle(node);
   return {border:c.borderTopWidth,background:c.backgroundColor,minHeight:c.minHeight};
  });
  expect(styles.border).toBe('0px');
  expect(styles.background).toBe('rgba(0, 0, 0, 0)');
  expect(styles.minHeight).toBe('0px');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 });
}

test('policy has button-style Privacy Center and keeps real print control',async({page})=>{
 await page.goto('/legal/privacy');
 await expect(page.getByRole('link',{name:'Privacy Center'}).last()).toHaveAttribute('href','/account/privacy');
 await expect(page.locator('.legal-article a.legal-inline-button').first()).toHaveCSS('display','inline-flex');
 const actions=page.locator('.legal-document-actions');
 await expect(actions.getByRole('button',{name:'Print document'})).toBeVisible();
 await expect(page.locator('.legal-document-brand')).toContainText("Harley's Studios");
 await expect(page.locator('.legal-article hr')).toHaveCount(0);
});
test('home recovery action is a button visually but remains a navigable link',async({page})=>{
 await page.setViewportSize({width:390,height:850});
 await page.goto('/');
 const recovery=page.getByRole('link',{name:'Forgot your login? Recover your Pup Account'});
 await expect(recovery).toHaveClass(/pup-link-button/);
 await expect(recovery).toHaveAttribute('href','/recovery');
 await expect(recovery).toHaveCSS('display','flex');
});
