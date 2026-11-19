import {test,expect} from '@playwright/test';

// All entry points share one markup hierarchy and two viewport-specific views.
// Verify DOM layout, sharp source assets, and controls rather than screenshot
// pixels so the tests remain stable across browsers and render engines.
for(const [name,width,height,expected] of [
 ['small phone',320,640,'mobile'],
 ['Android phone',360,780,'mobile'],
 ['mobile landscape',832,384,'mobile'],
 ['tablet',800,900,'mobile'],
 ['desktop',1366,768,'desktop']
]){
 test('PupDex View Asset uses '+name+' layout',async({page})=>{
  await page.setViewportSize({width,height});
  await page.goto('/puppies?pup=v1_aurora');
  const details=page.locator('dialog.meet-puppy-dialog');
  await expect(details).toBeVisible();
  await details.getByRole('button',{name:'View Asset'}).click();
  const viewer=page.locator('dialog.meet-asset-dialog');
  await expect(viewer).toBeVisible();
  const stage=viewer.locator('.meet-asset-stage');
  const panel=viewer.locator('.meet-asset-panel');
  await expect(stage).toBeVisible();
  await expect(panel).toBeVisible();
  await expect(viewer.getByRole('button',{name:'Copy Asset ID'})).toBeVisible();
  await expect(viewer.getByRole('button',{name:'Close Viewer'})).toBeVisible();
  const metrics=await viewer.evaluate(dialog=>{
   const stage=dialog.querySelector('.meet-asset-stage');
   const panel=dialog.querySelector('.meet-asset-panel');
   const image=stage.querySelector('img.puppy-artwork');
   const body=dialog.querySelector('.meet-asset-layout');
   const a=stage.getBoundingClientRect(),b=panel.getBoundingClientRect();
   return {
    layout:getComputedStyle(body).display,
    left:a.left,right:a.right,top:a.top,bottom:a.bottom,
    panelLeft:b.left,panelTop:b.top,
    imageSource:new URL(image.currentSrc).pathname,
    imageWidth:image.getBoundingClientRect().width,
    naturalWidth:image.naturalWidth,
    horizontalOverflow:document.documentElement.scrollWidth-document.documentElement.clientWidth
   };
  });
  expect(metrics.imageSource).toBe('/assets/transparent/v1/v1_aurora.png');
  expect(metrics.imageWidth).toBeLessThanOrEqual(metrics.naturalWidth+1);
  expect(metrics.horizontalOverflow).toBeLessThanOrEqual(2);
  if(expected==='mobile'){
   expect(metrics.layout).toBe('flex');
   expect(metrics.panelTop).toBeGreaterThanOrEqual(metrics.bottom-2);
  }else{
   expect(metrics.layout).toBe('grid');
   expect(metrics.panelLeft).toBeGreaterThanOrEqual(metrics.right-2);
  }
  await viewer.getByRole('button',{name:'Hide transparency grid'}).click();
  await expect(stage).not.toHaveClass(/meet-asset-checker/);
  await viewer.getByRole('button',{name:'Close Viewer'}).click();
  await expect(viewer).toHaveCount(0);
  await expect(details).toBeVisible();
 });
}

test('roster View Asset uses identical desktop workspace',async({page})=>{
 await page.setViewportSize({width:1366,height:850});
 await page.goto('/play');
 await expect(page.getByRole('button',{name:'Tap Buddy to earn Treats'})).toBeVisible();
 await page.getByRole('button',{name:'Roster',exact:true}).click();
 const roster=page.getByTestId('puppy-roster-grid');
 await roster.locator('[data-pup-card="aurora"]').getByRole('button',{name:'View Details'}).click();
 await page.getByRole('button',{name:'View Asset'}).click();
 const viewer=page.locator('dialog.play-pupdex-asset-dialog');
 await expect(viewer).toBeVisible();
 await expect(viewer.locator('.meet-asset-layout')).toHaveCSS('display','grid');
 await expect(viewer.locator('.meet-asset-panel')).toBeVisible();
 await viewer.getByRole('button',{name:'Close Viewer'}).click();
 await expect(viewer).toHaveCount(0);
});

test('inventory View Asset uses identical mobile sheet',async({page})=>{
 await page.setViewportSize({width:360,height:780});
 await page.goto('/account/inventory');
 const inventory=page.getByTestId('pup-inventory');
 await inventory.locator('[data-pup-inventory-id="classic"]')
  .getByRole('button',{name:'View Buddy puppy details'}).click();
 await page.locator('dialog.pup-inventory-detail-dialog')
  .getByRole('button',{name:'View Asset'}).click();
 const viewer=page.locator('dialog.play-pupdex-asset-dialog');
 await expect(viewer).toBeVisible();
 await expect(viewer.locator('.meet-asset-layout')).toHaveCSS('display','flex');
 await expect(viewer.locator('.meet-asset-panel')).toBeVisible();
 await viewer.getByRole('button',{name:'Close Viewer'}).click();
 await expect(viewer).toHaveCount(0);
});
