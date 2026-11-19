import {test,expect} from '@playwright/test';

async function openRoster(page,width){
 await page.setViewportSize({width,height:850});
 await page.goto('/play');
 await expect(page.getByRole('button',{name:'Tap Buddy to earn Treats'})).toBeVisible();
 if(width>=1000)await page.getByRole('button',{name:'Roster',exact:true}).click();
 else await page.getByRole('tab',{name:'🐶 Roster'}).click();
 return page.getByTestId('puppy-roster-grid');
}

for(const width of [320,360,1366]){
 test('in-game roster uses holographic rarity cards at '+width+'px',async({page})=>{
  const grid=await openRoster(page,width);
  await expect(grid).toBeVisible();
  await expect(grid.locator('.play-pupdex-card').first()).toBeVisible();
  const epic=grid.locator('[data-pup-card="aurora"]');
  await expect(epic).toHaveAttribute('data-rarity','epic');
  await expect(epic.locator('.meet-puppy-badge-rarity')).toContainText('Epic');
  await expect(epic.locator('.meet-puppy-badge')).toHaveCount(3);
  await expect(epic.getByRole('button',{name:'View Details'})).toBeVisible();
  await expect(epic.getByRole('button',{name:/Use Aurora/})).toHaveCount(0);
  await expect(grid.getByRole('button',{name:'Inspect Sunny'})).toBeVisible();
  const dimensions=await grid.evaluate(node=>{
   const card=node.querySelector('.play-pupdex-card');
   const css=getComputedStyle(card);
   return {
    grid:getComputedStyle(node).display,
    border:css.borderTopColor,
    bg:css.backgroundImage,
    horizontalOverflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
    usableButton:card.querySelector('.play-pupdex-details').getBoundingClientRect().height
   };
  });
  expect(dimensions.grid).toBe('grid');
  expect(dimensions.bg).toContain('gradient');
  expect(dimensions.usableButton).toBeGreaterThanOrEqual(40);
  expect(dimensions.horizontalOverflow).toBeLessThanOrEqual(2);
 });
}

test('in-game details open a full-size asset viewer without mutating the collection',async({page})=>{
 const grid=await openRoster(page,360);
 await grid.locator('[data-pup-card="aurora"]').getByRole('button',{name:'View Details'}).click();
 await expect(page.getByText('Aurora-purple and teal fur glow.')).toBeVisible();
 await page.getByRole('button',{name:'View Asset'}).click();
 const viewer=page.locator('dialog.play-pupdex-asset-dialog');
 await expect(viewer).toBeVisible();
 await expect(viewer.getByRole('heading',{name:'Aurora'})).toBeVisible();
 await expect(viewer.getByRole('img',{name:/full-size transparent puppy artwork/})).toBeVisible();
 await expect.poll(()=>viewer.locator('img.puppy-artwork').evaluate(img=>img.naturalWidth)).toBeGreaterThan(0);
 const source=await viewer.locator('img.puppy-artwork').evaluate(img=>({
  path:new URL(img.currentSrc).pathname,
  width:img.getBoundingClientRect().width,
  natural:img.naturalWidth,
  filter:getComputedStyle(img).filter
 }));
 expect(source.path).toBe('/assets/transparent/v1/v1_aurora.png');
 expect(source.width).toBeLessThanOrEqual(source.natural+1);
 expect(source.filter).toBe('none');
 await expect(viewer.getByRole('button',{name:'Hide transparency grid'})).toHaveAttribute('aria-pressed','true');
 await viewer.getByRole('button',{name:'Hide transparency grid'}).click();
 await expect(viewer.getByRole('button',{name:'Show transparency grid'})).toHaveAttribute('aria-pressed','false');
 await viewer.getByRole('button',{name:'Close Viewer'}).click();
 await expect(viewer).toHaveCount(0);
 await expect(page.getByRole('button',{name:'View Asset'})).toBeVisible();
 await expect(grid.locator('[data-pup-card="aurora"]').getByText('🔒 Locked')).toBeVisible();
});
