import {test,expect} from '@playwright/test';

for(const [mode,width] of [['phone',360],['small-phone',320],['desktop',1366]]){
 test(mode+' account inventory has the same owned-puppy rarity cards as PupDex',async({page})=>{
  await page.setViewportSize({width,height:850});
  await page.goto('/account/inventory');
  const inventory=page.getByTestId('pup-inventory');
  await expect(inventory).toBeVisible();
  await expect(inventory.getByRole('heading',{name:'Inventory',exact:true})).toBeVisible();
  await expect(inventory.locator('.pup-inventory-puppies')).toBeVisible();
  const current=inventory.locator('[data-pup-inventory-id="classic"]');
  await expect(current).toHaveAttribute('data-rarity','common');
  await expect(current.locator('.meet-puppy-badge-rarity')).toContainText('Common');
  await expect(current.getByText('Owned',{exact:true})).toBeVisible();
  await expect(current.getByText('Current',{exact:true})).toBeVisible();
  await expect(current.getByRole('button',{name:'View Buddy puppy details'})).toBeVisible();
  const values=await inventory.evaluate(node=>{
   const first=node.querySelector('[data-pup-inventory-id="classic"]');
   const btn=first.querySelector('.pup-inventory-view');
   const grid=node.querySelector('.pup-inventory-puppies');
   return {width:document.documentElement.scrollWidth-document.documentElement.clientWidth,
    layout:getComputedStyle(grid).display,gradient:getComputedStyle(first).backgroundImage,
    foil:getComputedStyle(first).getPropertyValue('--rarity-rgb').trim(),
    buttonHeight:btn.getBoundingClientRect().height};
  });
  expect(values.width).toBeLessThanOrEqual(2);
  expect(values.layout).toBe('grid');
  expect(values.gradient).toContain('gradient');
  expect(values.foil).not.toBe('');
  expect(values.buttonHeight).toBeGreaterThanOrEqual(44);
  await inventory.getByRole('combobox',{name:'Filter inventory by rarity'}).selectOption('legendary');
  await expect(inventory.locator('.pup-inventory-puppies')).toHaveCount(0);
  await expect(inventory.getByText('No owned puppies match these filters.')).toBeVisible();
  await inventory.getByRole('button',{name:'Reset filters'}).click();
  await expect(current).toBeVisible();
 });
}

test('account inventory puppy details and full artwork viewer match PupDex without changing owned progress',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/account/inventory');
 const inventory=page.getByTestId('pup-inventory');
 const before=await page.evaluate(()=>localStorage.getItem('puppy_test_authoritative_kotlin_save_v1'));
 await inventory.locator('[data-pup-inventory-id="classic"]').getByRole('button',{name:'View Buddy puppy details'}).click();
 const details=page.locator('dialog.pup-inventory-detail-dialog');
 await expect(details).toBeVisible();
 await expect(details.getByText('Owned',{exact:true})).toBeVisible();
 await expect(details.getByRole('button',{name:'Copy Link'})).toBeVisible();
 await expect(details.getByRole('link',{name:'Open in PupDex'})).toHaveAttribute('href','/puppies?pup=v1_classic');
 await details.getByRole('button',{name:'View Asset'}).click();
 const viewer=page.locator('dialog.play-pupdex-asset-dialog');
 await expect(viewer).toBeVisible();
 await expect(viewer.getByRole('img',{name:/full-size transparent puppy artwork/})).toBeVisible();
 await expect.poll(()=>viewer.locator('img.puppy-artwork').evaluate(img=>img.naturalWidth)).toBeGreaterThan(0);
 const image=await viewer.locator('img.puppy-artwork').evaluate(img=>({
  path:new URL(img.currentSrc).pathname,
  width:img.getBoundingClientRect().width,
  natural:img.naturalWidth,
  filter:getComputedStyle(img).filter
 }));
 expect(image.path).toBe('/assets/transparent/v1/v1_classic.png');
 expect(image.width).toBeLessThanOrEqual(image.natural+1);
 expect(image.filter).toBe('none');
 await expect(viewer.getByRole('button',{name:'Hide transparency grid'})).toHaveAttribute('aria-pressed','true');
 await viewer.getByRole('button',{name:'Close Viewer'}).click();
 await expect(viewer).toHaveCount(0);
 await expect(details).toBeVisible();
 await details.getByRole('button',{name:'Done'}).click();
 await expect(details).toHaveCount(0);
 const after=await page.evaluate(()=>localStorage.getItem('puppy_test_authoritative_kotlin_save_v1'));
 expect(after).toBe(before);
});

test('inventory sections keep ticket rarity colors and wallet balances readable',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/account/inventory');
 const inventory=page.getByTestId('pup-inventory');
 await inventory.locator('.pup-inventory-tabs').getByRole('button',{name:/Tickets/}).click();
 const tickets=inventory.locator('.pup-inventory-item');
 await expect(tickets).toHaveCount(5);
 for(const rarity of ['common','uncommon','rare','epic','legendary']){
  const ticket=inventory.locator('.pup-inventory-item[data-rarity="'+rarity+'"]');
  await expect(ticket).toBeVisible();
  await expect(ticket).toContainText(rarity.charAt(0).toUpperCase()+rarity.slice(1));
 }
 await inventory.locator('.pup-inventory-tabs').getByRole('button',{name:/Wallet/}).click();
 await expect(inventory.getByText('Treats',{exact:true})).toBeVisible();
 await expect(inventory.locator('.pup-inventory-item[data-rarity="neutral"]')).toHaveCount(4);
 await inventory.locator('.pup-inventory-tabs').getByRole('button',{name:/Accessories/}).click();
 await expect(inventory.getByRole('heading',{name:'🎀 Accessories'})).toBeVisible();
 await inventory.locator('.pup-inventory-tabs').getByRole('button',{name:/Upgrades/}).click();
 await expect(inventory.getByRole('heading',{name:'⬆️ Purchased upgrades'})).toBeVisible();
});

for(const width of [360,1366])test('play inventory uses the same collectible component at '+width+'px',async({page})=>{
 await page.setViewportSize({width,height:850});
 await page.goto('/play');
 await expect(page.getByRole('button',{name:'Tap Buddy to earn Treats'})).toBeVisible();
 if(width>=1000)await page.getByTestId('desktop-navigation').getByRole('button',{name:'Inventory'}).click();
 else await page.getByRole('button',{name:'Open inventory'}).click();
 const inventory=page.getByTestId('pup-inventory');
 await expect(inventory).toBeVisible();
 await expect(inventory.locator('[data-pup-inventory-id="classic"]')).toHaveAttribute('data-rarity','common');
 await expect(inventory.getByRole('button',{name:'View Buddy puppy details'})).toBeVisible();
 await inventory.getByRole('button',{name:'← Back to game'}).click();
 await expect(inventory).toHaveCount(0);
});


for(const width of [320,360,390,1366]){
 test('inventory art keeps a small category pill, never a dark oval at '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:800});
  await page.goto('/account/inventory');
  const puppy=page.getByTestId('pup-inventory').locator('[data-pup-inventory-id="classic"]');
  const art=puppy.locator('.meet-puppy-art');
  const badge=art.locator('.meet-puppy-group');
  await expect(art).toBeVisible();
  await expect(badge).toBeVisible();
  const geometry=await art.evaluate(node=>{
   const artBox=node.getBoundingClientRect();
   const badge=node.querySelector('.meet-puppy-group');
   const pillBox=badge.getBoundingClientRect();
   const img=node.querySelector('img.puppy-artwork');
   const imageStyle=getComputedStyle(img);
   const pillStyle=getComputedStyle(badge);
   return {
    artWidth:artBox.width,artHeight:artBox.height,
    badgeHeight:pillBox.height,badgeWidth:pillBox.width,
    coverage:(pillBox.width*pillBox.height)/(artBox.width*artBox.height),
    insetTop:pillBox.top-artBox.top,
    insetRight:artBox.right-pillBox.right,
    badgeBottom:pillStyle.bottom,badgeLeft:pillStyle.left,
    imageRadius:imageStyle.borderRadius,
    imageOpacity:imageStyle.opacity,
    pictureLoaded:img.complete&&img.naturalWidth>0
   };
  });
  expect(geometry.artHeight).toBeGreaterThanOrEqual(130);
  expect(geometry.badgeHeight).toBeLessThan(38);
  expect(geometry.coverage).toBeLessThan(0.17);
  expect(geometry.insetTop).toBeGreaterThanOrEqual(0);
  expect(geometry.insetTop).toBeLessThanOrEqual(16);
  expect(geometry.insetRight).toBeGreaterThanOrEqual(0);
  expect(geometry.insetRight).toBeLessThanOrEqual(17);
  expect(geometry.badgeBottom).toBe('auto');
  expect(geometry.badgeLeft).toBe('auto');
  expect(geometry.imageRadius).toBe('0px');
  expect(geometry.imageOpacity).toBe('1');
  expect(geometry.pictureLoaded).toBe(true);
  await puppy.getByRole('button',{name:'Inspect Buddy'}).click();
  await expect(page.locator('dialog.pup-inventory-detail-dialog')).toBeVisible();
  await page.locator('dialog.pup-inventory-detail-dialog').getByRole('button',{name:'Done'}).click();
 });
}
