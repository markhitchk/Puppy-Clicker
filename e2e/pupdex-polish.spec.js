import {test,expect} from '@playwright/test';

for(const [device,width,height] of [['small phone',320,640],['Android phone',360,780],['tablet',800,900],['desktop',1366,768]]){
 test(device+' PupDex uses distinct rarity pills and responsive controls',async({page})=>{
  await page.setViewportSize({width,height});
  await page.goto('/puppies');
  const card=page.getByRole('link',{name:'View Aurora puppy details'});
  await expect(card).toBeVisible();
  await expect(card.locator('.meet-puppy-badge')).toHaveCount(2);
  await expect(card.locator('.meet-puppy-badge-rarity')).toContainText('Epic');
  await expect(card.locator('.meet-puppy-badges')).toHaveCSS('display','flex');
  const art=card.locator('xpath=ancestor::article');
  await expect(art).toHaveAttribute('data-rarity','epic');
  const styles=await page.evaluate(()=>{
   const container=document.querySelector('.meet-puppy-filters');
   const buttons=Array.from(container.querySelectorAll('button'));
   const first=document.querySelector('.meet-puppy-card');
   const right=Math.max(...buttons.map(b=>b.getBoundingClientRect().right));
   return {
    overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
    filterRight:right,
    filterWidth:container.getBoundingClientRect().width,
    minButtonHeight:Math.min(...buttons.map(b=>b.getBoundingClientRect().height)),
    rarityColor:getComputedStyle(first).getPropertyValue('--rarity-rgb').trim()
   };
  });
  expect(styles.overflow).toBeLessThanOrEqual(2);
  expect(styles.filterRight).toBeLessThanOrEqual(width+1);
  expect(styles.minButtonHeight).toBeGreaterThanOrEqual(44);
  expect(styles.rarityColor.length).toBeGreaterThan(0);
  await page.getByRole('combobox',{name:'Rarity',exact:true}).selectOption('legendary');
  await expect(page.locator('.meet-puppy-card')).not.toHaveCount(0);
  await expect(page.locator('.meet-puppy-card[data-rarity="legendary"]').first()).toBeVisible();
 });
}

test('asset viewer opens from public details, previews transparency, and closes with Escape',async({page})=>{
 await page.setViewportSize({width:360,height:780});
 await page.goto('/puppies?pup=v1_aurora');
 const details=page.locator('dialog.meet-puppy-dialog');
 await expect(details).toBeVisible();
 await expect(details.locator('.meet-detail-identity')).toHaveAttribute('data-rarity','epic');
 await details.getByRole('button',{name:'View Asset'}).click();
 const viewer=page.locator('dialog.meet-asset-dialog');
 await expect(viewer).toBeVisible();
 await expect(viewer.getByRole('heading',{name:'Aurora'})).toBeVisible();
 await expect(viewer.getByText('v1_aurora')).toBeVisible();
 await expect(viewer.getByRole('img',{name:/full-size transparent puppy artwork/})).toBeVisible();
 await expect.poll(()=>viewer.locator('img.puppy-artwork').evaluate(img=>img.naturalWidth)).toBeGreaterThan(0);
 const render=await viewer.locator('img.puppy-artwork').evaluate(img=>({
  source:new URL(img.currentSrc).pathname,
  natural:img.naturalWidth,
  rendered:img.getBoundingClientRect().width,
  filter:getComputedStyle(img).filter
 }));
 expect(render.source).toBe('/assets/transparent/v1/v1_aurora.png');
 expect(render.rendered).toBeLessThanOrEqual(render.natural+1);
 expect(render.filter).toBe('none');
 const toggle=viewer.getByRole('button',{name:'Hide transparency grid'});
 await expect(toggle).toHaveAttribute('aria-pressed','true');
 await toggle.click();
 await expect(viewer.locator('.meet-asset-stage')).not.toHaveClass(/meet-asset-checker/);
 await expect(viewer.getByRole('button',{name:'Show transparency grid'})).toHaveAttribute('aria-pressed','false');
 await page.keyboard.press('Escape');
 await expect(viewer).toHaveCount(0);
 await expect(details).toBeVisible();
 await page.keyboard.press('Escape');
 await expect(details).toHaveCount(0);
 await expect(page).toHaveURL(/\/puppies$/);
});

test('Puppy Details keeps utility actions together and primary action distinct',async({page})=>{
 await page.setViewportSize({width:360,height:780});
 await page.goto('/puppies?pup=v1_aurora');
 const details=page.locator('dialog.meet-puppy-dialog');
 await expect(details.locator('.meet-detail-actions button')).toHaveCount(2);
 await expect(details.getByRole('link',{name:'Use Puppy in Game'})).toHaveAttribute('href','/play');
 await expect(details.getByRole('button',{name:'Done'})).toBeVisible();
 await expect(details.getByRole('button',{name:'Retry Art'})).toHaveCount(0);
 const sizes=await details.evaluate(root=>{
  const primary=root.querySelector('.meet-detail-primary').getBoundingClientRect();
  const done=root.querySelector('.meet-detail-done').getBoundingClientRect();
  const toolA=root.querySelector('.meet-detail-actions button:first-child').getBoundingClientRect();
  const toolB=root.querySelector('.meet-detail-actions button:last-child').getBoundingClientRect();
  return {primary:primary.width,done:done.width,toolsAligned:Math.abs(toolA.top-toolB.top)<2,toolsSameHeight:Math.abs(toolA.height-toolB.height)<2};
 });
 expect(sizes.primary).toBeGreaterThan(270);
 expect(Math.abs(sizes.primary-sizes.done)).toBeLessThan(3);
 expect(sizes.toolsAligned).toBe(true);
 expect(sizes.toolsSameHeight).toBe(true);
});