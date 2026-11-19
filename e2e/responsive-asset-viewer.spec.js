import {test,expect} from '@playwright/test';

// All entry points share one markup hierarchy and two viewport-specific views.
// Verify DOM layout, sharp source assets, and controls rather than screenshot
// pixels so the tests remain stable across browsers and render engines.
const viewports=[
 ['small phone',320,640,'mobile'],
 ['Android phone',360,780,'mobile'],
 ['modern phone',390,844,'mobile'],
 ['mobile landscape',832,384,'mobile'],
 ['tablet',800,900,'mobile'],
 ['wide tablet',959,800,'mobile'],
 ['desktop breakpoint',960,800,'desktop'],
 ['laptop',1366,768,'desktop'],
 ['desktop',1920,1080,'desktop']
];

for(const [name,width,height,expected] of viewports){
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
  await viewer.locator("img.puppy-artwork").evaluate(img=>img.decode());
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

for(const [device,width,height,layout] of viewports){
 test(device+' account, inventory and game navigation fit the viewport',async({page})=>{
  await page.setViewportSize({width,height});
  await page.goto('/account?signedout');
  const auth=page.getByTestId('pup-auth-form');
  await auth.getByRole('tab',{name:'Create Account'}).click();
  await expect(auth.getByRole('button',{name:'Register with Discord'})).toBeVisible();
  await expect(auth.getByRole('checkbox')).toHaveCount(2);
  await auth.getByRole('tab',{name:'Sign In'}).click();
  await auth.getByRole('link',{name:/Recover account/}).click();
  await expect(page).toHaveURL(/\/recovery$/);
  await page.goto('/account/inventory');
  const inventory=page.getByTestId('pup-inventory');
  await inventory.getByRole('combobox',{name:'Filter inventory by rarity'}).selectOption('legendary');
  await inventory.getByRole('button',{name:'Reset filters'}).click();
  await inventory.getByRole('button',{name:'View Buddy puppy details'}).click();
  await expect(page.locator('dialog.pup-inventory-detail-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog.pup-inventory-detail-dialog')).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  await page.goto('/play');
  const roster=layout==='desktop'
   ?page.getByTestId('desktop-navigation').getByRole('button',{name:'Roster',exact:true})
   :page.getByRole('tab',{name:'🐶 Roster'});
  await roster.click();
  await expect(page.getByTestId('puppy-roster-grid')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
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

test('an open viewer switches layouts at 960px and restores keyboard focus',async({page})=>{
 await page.setViewportSize({width:959,height:800});
 await page.goto('/puppies?pup=v2_test_crash_dummy');
 const opener=page.getByRole('button',{name:'View Asset'});
 await opener.click();
 const viewer=page.locator('dialog.meet-asset-dialog');
 const layout=viewer.locator('.meet-asset-layout');
 await viewer.getByRole('button',{name:'Hide transparency grid'}).click();
 for(const [width,height,display] of [[960,800,'grid'],[1920,1080,'grid'],[832,384,'flex'],[320,640,'flex']]){
  await page.setViewportSize({width,height});
  await expect(layout).toHaveCSS('display',display);
  await expect(viewer.getByRole('button',{name:'Show transparency grid'})).toHaveAttribute('aria-pressed','false');
  expect(await viewer.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1);
 }
 await page.keyboard.press('Escape');
 await expect(opener).toBeFocused();
});

test('every catalog entry opens its own lossless source and preserves native dimensions',async({page})=>{
 const {default:roster}=await import('../src/data/roster.js');
 await page.setViewportSize({width:1366,height:768});
 await page.goto('/puppies');
 for(const puppy of roster){
  const filename=puppy.image.split('/').pop().replace(/\.png$/,'');
  const card=page.locator('.meet-puppy-link[href="/puppies?pup='+filename+'"]');
  await card.click();
  const details=page.locator('dialog.meet-puppy-dialog');
  await details.getByRole('button',{name:'View Asset'}).click();
  const viewer=page.locator('dialog.meet-asset-dialog');
  const art=await viewer.locator('.puppy-artwork').evaluate(async img=>{
   await img.decode();
   const rect=img.getBoundingClientRect();
   return {path:new URL(img.currentSrc).pathname,width:rect.width,height:rect.height,
    originalWidth:img.naturalWidth,originalHeight:img.naturalHeight};
  });
  expect(art.path,puppy.id).toBe(puppy.image.replace(/^\/assets\/(v1|v2)\//,'/assets/transparent/$1/'));
  expect(art.width).toBeGreaterThan(0);
  expect(art.width).toBeLessThanOrEqual(art.originalWidth+1);
  expect(art.height).toBeLessThanOrEqual(art.originalHeight+1);
  expect(Math.abs(art.height-art.width*art.originalHeight/art.originalWidth)).toBeLessThan(1);
  await page.keyboard.press('Escape');
  await details.getByRole('button',{name:'Done'}).click();
 }
});
