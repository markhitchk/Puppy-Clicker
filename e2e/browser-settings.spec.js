import {test,expect} from '@playwright/test';

test('guest can open browser settings without logging in and preferences survive a reload',async({page})=>{
 await page.goto('/settings');
 await expect(page.getByRole('heading',{name:'Browser Settings'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Graphics & performance'})).toBeVisible();
 const reduce=page.getByRole('switch',{name:'Reduced motion'});
 await reduce.check();
 await expect(reduce).toBeChecked();
 await page.reload();
 await expect(page.getByRole('switch',{name:'Reduced motion'})).toBeChecked();
 await page.getByRole('button',{name:'Reset browser preferences'}).click();
 await page.getByRole('button',{name:'Confirm reset'}).click();
 await expect(page.getByRole('switch',{name:'Reduced motion'})).not.toBeChecked();
});
test('guest demo includes browser-settings link and does not redirect to sign-in',async({page})=>{
 await page.goto('/play?=demo&signedout=1');
 await page.getByRole('link',{name:/Browser settings/i}).last().click();
 await expect(page).toHaveURL(/\/settings$/);
 await expect(page.getByRole('heading',{name:'Browser Settings'})).toBeVisible();
});

test('mobile navigation is compact and settings controls remain reachable',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/settings');
 await page.locator('.site-nav-toggle').click();
 const menu=page.locator('.site-header .site-nav.is-open');
 await expect(menu).toBeVisible();
 const columns=await menu.evaluate(node=>getComputedStyle(node).gridTemplateColumns.split(' ').length);
 expect(columns).toBe(2);
 const bounds=await menu.boundingBox();
 expect(bounds.height).toBeLessThan(430);
 await page.keyboard.press('Escape');
 await expect(menu).toBeHidden();
 const notification=page.getByRole('switch',{name:'Daily reward reminders'});
 await notification.scrollIntoViewIfNeeded();
 const row=await notification.locator('xpath=..').boundingBox();
 expect(row.height).toBeLessThan(76);
 await notification.uncheck();
 await expect(notification).not.toBeChecked();
});

test('appearance, light mode, accent and puppy mouse cursor update immediately and persist',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await page.goto('/settings');
 await page.getByRole('radio',{name:'Light',exact:true}).check();
 await expect(page.locator('html')).toHaveAttribute('data-puppy-theme','light');
 await expect(page.locator('.browser-settings-panel').first()).toHaveCSS('background-color','rgb(255, 255, 255)');
 await page.getByRole('radio',{name:'Purple',exact:true}).check();
 await expect(page.locator('html')).toHaveCSS('--site-accent','#8B5CF6');
 await page.getByRole('radio',{name:'System pointer'}).check();
 await expect(page.locator('html')).toHaveAttribute('data-puppy-cursor','disabled');
 await page.reload();
 await expect(page.getByRole('radio',{name:'Light',exact:true})).toBeChecked();
 await expect(page.getByRole('radio',{name:'Purple',exact:true})).toBeChecked();
 await expect(page.getByRole('radio',{name:'System pointer'})).toBeChecked();
 await expect(page.locator('html')).toHaveAttribute('data-puppy-cursor','disabled');
 await page.goto('/');
 await expect(page.locator('html')).toHaveAttribute('data-puppy-theme','light');
 await expect(page.locator('html')).toHaveCSS('--site-accent','#8B5CF6');
});

test('follow-device theme tracks system changes and reset restores default colors',async({page})=>{
 await page.emulateMedia({colorScheme:'light'});
 await page.goto('/settings');
 await page.getByRole('radio',{name:'Follow device'}).check();
 await expect(page.locator('html')).toHaveAttribute('data-puppy-theme','light');
 await page.emulateMedia({colorScheme:'dark'});
 await expect(page.locator('html')).toHaveAttribute('data-puppy-theme','dark');
 await page.getByRole('button',{name:'Reset browser preferences'}).click();
 await page.getByRole('button',{name:'Confirm reset'}).click();
 await expect(page.locator('html')).toHaveAttribute('data-puppy-theme','dark');
 await expect(page.getByRole('radio',{name:'Puppy Cyan'})).toBeChecked();
});


test('system-like Puppy size and enabled mouse click highlight are defaults',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await page.goto('/settings#puppy-pointer-settings');
 const root=page.locator('html');
 await expect(page.getByRole('radio',{name:'Original Puppy pointer'})).toBeChecked();
 await expect(page.getByRole('radio',{name:'Match system size'})).toBeChecked();
 await expect(page.getByRole('switch',{name:'Highlight mouse clicks'})).toBeChecked();
 await expect(root).toHaveAttribute('data-puppy-cursor-size','system');
 await expect(root).toHaveAttribute('data-puppy-pointer-halo','enabled');
 await expect(page.locator('.browser-pointer-preview img').first()).toHaveAttribute('src','/assets/pointers/themes/puppy_pointer_dark_default_32.png');
 expect(await page.locator('body').evaluate(node=>getComputedStyle(node).cursor)).toContain('puppy_pointer_dark_default_32.png');
 await expect(page.locator('#puppy-pointer-size')).toHaveCount(0);
 await expect(page.getByRole('radio',{name:'Classic paw'})).toHaveCount(0);

 // The system pointer itself can still show an accent-colored click halo.
 await page.getByRole('radio',{name:'System pointer'}).check();
 await expect(root).toHaveAttribute('data-puppy-cursor','disabled');
 await expect(root).toHaveAttribute('data-puppy-pointer-halo','enabled');
 await expect(page.locator('#puppy-pointer-size')).toHaveCount(0);
 expect(await page.locator('body').evaluate(node=>getComputedStyle(node).cursor)).not.toContain('puppy_pointer_');
 await page.getByRole('radio',{name:'Original Puppy pointer'}).check();

 await page.getByRole('radio',{name:'Custom size'}).check();
 const slider=page.locator('#puppy-pointer-size');
 await expect(slider).toBeVisible();
 await expect(slider).toHaveAttribute('min','24');
 await expect(slider).toHaveAttribute('max','96');
 await expect(slider).toHaveAttribute('step','8');
 await slider.focus();
 await slider.press('End');
 await expect(slider).toHaveValue('96');
 await expect(root).toHaveAttribute('data-puppy-cursor-size','custom-96');
 await expect(page.locator('.browser-pointer-preview img').first()).toHaveAttribute('src','/assets/pointers/themes/puppy_pointer_dark_default_96.png');
 const large=await page.request.get('/assets/pointers/themes/puppy_pointer_dark_default_96.png');
 expect(large.ok()).toBe(true);
 expect((await large.body()).readUInt32BE(16)).toBe(96);

 await slider.press('Home');
 await expect(slider).toHaveValue('24');
 await expect(root).toHaveAttribute('data-puppy-cursor-size','custom-24');
 const small=await page.request.get('/assets/pointers/themes/puppy_pointer_dark_default_24.png');
 expect(small.ok()).toBe(true);
 expect((await small.body()).readUInt32BE(16)).toBe(24);
 await page.getByRole('radio',{name:'Light cursor'}).check();
 await expect(page.locator('.browser-pointer-preview img').first()).toHaveAttribute('src','/assets/pointers/themes/puppy_pointer_light_default_24.png');

 // Interface size no longer silently resizes the mouse pointer.
 await page.getByRole('radio',{name:'Large',exact:true}).check();
 await expect(root).toHaveAttribute('data-puppy-cursor-size','custom-24');
 await page.reload();
 await expect(page.getByRole('radio',{name:'Custom size'})).toBeChecked();
 await expect(page.locator('#puppy-pointer-size')).toHaveValue('24');
 await expect(root).toHaveAttribute('data-puppy-pointer-halo','enabled');
 await page.getByRole('switch',{name:'Highlight mouse clicks'}).uncheck();
 await expect(root).toHaveAttribute('data-puppy-pointer-halo','disabled');
 await page.reload();
 await expect(page.getByRole('switch',{name:'Highlight mouse clicks'})).not.toBeChecked();

 await page.getByRole('switch',{name:'Highlight mouse clicks'}).check();
 await page.getByRole('switch',{name:'Reduced motion'}).check();
 await expect(root).toHaveAttribute('data-puppy-pointer-halo','disabled');
 await page.getByRole('switch',{name:'Reduced motion'}).uncheck();
 await expect(root).toHaveAttribute('data-puppy-pointer-halo','enabled');

 await page.getByRole('button',{name:'Reset pointer customization'}).click();
 await expect(page.getByRole('radio',{name:'Match system size'})).toBeChecked();
 await expect(root).toHaveAttribute('data-puppy-cursor-size','system');
 await expect(root).toHaveAttribute('data-puppy-cursor-theme','dark');
 await expect(page.getByRole('switch',{name:'Highlight mouse clicks'})).toBeChecked();
 await expect(root).toHaveAttribute('data-puppy-pointer-halo','enabled');
});

test('matching website pointer theme reacts to device changes when site follows system',async({page})=>{
 await page.emulateMedia({colorScheme:'light'});
 await page.goto('/settings#puppy-pointer-settings');
 await page.getByRole('radio',{name:'Follow device'}).check();
 await page.getByRole('radio',{name:'Match website'}).check();
 await expect(page.locator('html')).toHaveAttribute('data-puppy-cursor-theme','light');
 await expect(page.locator('.browser-pointer-preview img').first()).toHaveAttribute('src','/assets/pointers/themes/puppy_pointer_light_default_32.png');
 await page.emulateMedia({colorScheme:'dark'});
 await expect(page.locator('html')).toHaveAttribute('data-puppy-cursor-theme','dark');
 await expect(page.locator('.browser-pointer-preview img').first()).toHaveAttribute('src','/assets/pointers/themes/puppy_pointer_dark_default_32.png');
});

test('desktop settings collapse to readable single-column layout on tablet-sized widths',async({page})=>{
 await page.setViewportSize({width:1000,height:900});
 await page.goto('/settings');
 const grid=page.locator('.browser-settings-grid');
 const columns=await grid.evaluate(element=>getComputedStyle(element).gridTemplateColumns.split(' ').length);
 expect(columns).toBe(1);
 await expect(page.getByRole('heading',{name:'Puppy mouse pointer'})).toBeVisible();
 const panel=await page.locator('#puppy-pointer-settings').boundingBox();
 expect(panel.width).toBeGreaterThan(580);
 expect(panel.width).toBeLessThan(800);
});


test('Android Compact interface leaves matching system-like Puppy cursor size unchanged',async({browser})=>{
 const context=await browser.newContext({
  viewport:{width:390,height:844},isMobile:true,hasTouch:true,
  userAgent:'Mozilla/5.0 (Linux; Android 17; SM-A176U1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36'
 });
 try{
  const page=await context.newPage();
  await page.goto('/settings#puppy-pointer-settings');
  await page.getByRole('radio',{name:'Compact',exact:true}).check();
  await expect(page.getByRole('radio',{name:'Compact',exact:true})).toBeChecked();
  await expect(page.locator('html')).toHaveAttribute('data-puppy-cursor-size','system');
  await expect(page.locator('#puppy-pointer-settings')).toContainText('Current Puppy pointer: 32 px');
  await expect(page.locator('.browser-pointer-preview img').first()).toHaveAttribute('src','/assets/pointers/themes/puppy_pointer_dark_default_32.png');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-puppy-cursor-size','system');
  await expect(page.getByRole('radio',{name:'Compact',exact:true})).toBeChecked();
 }finally{await context.close();}
});

test('ChromeOS viewport and text scaling keep browser settings in normal flow',async({page})=>{
 const sizes=[
  {width:390,height:844},
  {width:1000,height:700},
  {width:1188,height:668},
  {width:1366,height:768},
  {width:1920,height:1080}
 ];
 await page.goto('/settings');
 for(const size of sizes){
  await page.setViewportSize(size);
  const result=await page.locator('.browser-settings-grid').evaluate(grid=>{
   const panels=[...grid.querySelectorAll(':scope > .browser-settings-panel')];
   const boxes=panels.map(element=>element.getBoundingClientRect());
   const overlaps=[];
   for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
    const x=Math.min(boxes[i].right,boxes[j].right)-Math.max(boxes[i].left,boxes[j].left);
    const y=Math.min(boxes[i].bottom,boxes[j].bottom)-Math.max(boxes[i].top,boxes[j].top);
    if(x>1&&y>1)overlaps.push([i,j]);
   }
   return {columns:getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).length,
    overlaps,overflow:grid.scrollWidth-grid.clientWidth};
  });
  expect(result.overlaps,`Panels overlap at ${size.width}×${size.height}`).toEqual([]);
  expect(result.overflow,`Horizontal overflow at ${size.width}×${size.height}`).toBeLessThanOrEqual(2);
  if(size.width===1188||size.width===1366||size.width===1920)expect(result.columns).toBe(2);
  if(size.width===1000||size.width===390)expect(result.columns).toBe(1);
 }
 await page.setViewportSize({width:1188,height:668});
 const density=await page.locator('.browser-settings-grid>.browser-settings-panel').first().evaluate(el=>{
  const styles=getComputedStyle(el);
  return {padding:parseFloat(styles.paddingTop),radius:parseFloat(styles.borderTopLeftRadius)};
 });
 expect(density.padding).toBeLessThanOrEqual(19);
 expect(density.radius).toBeLessThanOrEqual(18);
 await page.setViewportSize({width:1440,height:900});
 await page.evaluate(()=>{document.documentElement.style.fontSize='20px';});
 const columns=await page.locator('.browser-settings-grid').evaluate(grid=>getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).length);
 expect(columns).toBe(1);
 await page.getByRole('radio',{name:'Original Puppy pointer'}).check();
 await expect(page.locator('.browser-pointer-preview-tile')).toHaveCount(3);
});

test('hybrid ChromeOS touchscreen and trackpad layout does not place panels on top of each other',async({browser})=>{
 const context=await browser.newContext({
  viewport:{width:1366,height:768},deviceScaleFactor:1.25,hasTouch:true,
  userAgent:'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36'
 });
 try{
  const page=await context.newPage();
  await page.goto('/settings');
  const panels=page.locator('.browser-settings-grid > .browser-settings-panel');
  await expect(panels).toHaveCount(5);
  const boxes=await panels.evaluateAll(elements=>elements.map(element=>{
   const r=element.getBoundingClientRect();
   return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};
  }));
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
   const horizontal=Math.min(boxes[i].right,boxes[j].right)-Math.max(boxes[i].left,boxes[j].left);
   const vertical=Math.min(boxes[i].bottom,boxes[j].bottom)-Math.max(boxes[i].top,boxes[j].top);
   expect(horizontal<=1||vertical<=1,`Panels ${i} and ${j} overlap on hybrid ChromeOS`).toBe(true);
  }
 }finally{await context.close();}
});
