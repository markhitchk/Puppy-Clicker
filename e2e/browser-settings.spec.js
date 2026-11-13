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
 await page.goto('/play?=demo');
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


test('system vs original Puppy pointer and shared interface sizing apply site-wide',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await page.goto('/settings#puppy-pointer-settings');
 const root=page.locator('html');
 await expect(page.getByRole('radio',{name:'Original Puppy pointer'})).toBeChecked();
 await expect(page.getByRole('radio',{name:'Classic paw'})).toHaveCount(0);
 await expect(page.getByRole('radio',{name:'Small · 32 px'})).toHaveCount(0);
 await page.getByRole('radio',{name:'System pointer'}).check();
 await expect(root).toHaveAttribute('data-puppy-cursor','disabled');
 await expect(page.getByRole('radio',{name:'Dark cursor'})).toHaveCount(0);
 expect(await page.locator('body').evaluate(node=>getComputedStyle(node).cursor)).not.toContain('puppy_pointer_');
 await page.getByRole('radio',{name:'Original Puppy pointer'}).check();
 await page.getByRole('radio',{name:'Compact',exact:true}).check();
 await expect(root).toHaveAttribute('data-puppy-cursor-size','compact');
 await expect(root).toHaveAttribute('data-puppy-cursor','enabled');
 await page.getByRole('radio',{name:'Dark cursor'}).check();
 await expect(root).toHaveAttribute('data-puppy-cursor-theme','dark');
 await expect(page.locator('.browser-pointer-preview img').first()).toHaveAttribute('src','/assets/pointers/themes/puppy_pointer_dark_default_48.png');
 const dark=await page.request.get('/assets/pointers/themes/puppy_pointer_dark_default_48.png');
 expect(dark.ok()).toBe(true);
 const raw=await dark.body();
 expect(raw.readUInt32BE(16)).toBe(48);
 expect(raw.readUInt32BE(20)).toBe(48);
 await page.getByRole('radio',{name:'Light cursor'}).check();
 await expect(root).toHaveAttribute('data-puppy-cursor-theme','light');
 await expect(page.locator('.browser-pointer-preview img').first()).toHaveAttribute('src','/assets/pointers/themes/puppy_pointer_light_default_48.png');
 const light=await page.request.get('/assets/pointers/themes/puppy_pointer_light_default_48.png');
 expect(light.ok()).toBe(true);
 expect((await light.body()).equals(raw)).toBe(false);
 await page.getByRole('switch',{name:'Highlight mouse clicks'}).check();
 await expect(root).toHaveAttribute('data-puppy-pointer-halo','enabled');
 await page.reload();
 await expect(page.getByRole('radio',{name:'Compact',exact:true})).toBeChecked();
 await expect(page.getByRole('radio',{name:'Original Puppy pointer'})).toBeChecked();
 await expect(page.getByRole('radio',{name:'Light cursor'})).toBeChecked();
 await page.getByRole('radio',{name:'Large',exact:true}).check();
 await expect(root).toHaveAttribute('data-puppy-cursor-size','large');
 await expect(page.locator('.browser-pointer-preview img').first()).toHaveAttribute('src','/assets/pointers/themes/puppy_pointer_light_default_96.png');
 await page.goto('/');
 await expect(root).toHaveAttribute('data-puppy-cursor-theme','light');
 await expect(root).toHaveAttribute('data-puppy-cursor-size','large');
 await page.goto('/settings#puppy-pointer-settings');
 await page.getByRole('button',{name:'Reset pointer customization'}).click();
 await expect(root).toHaveAttribute('data-puppy-cursor-theme','dark');
 await expect(root).toHaveAttribute('data-puppy-pointer-halo','disabled');
});

test('matching website pointer theme reacts to device changes when site follows system',async({page})=>{
 await page.emulateMedia({colorScheme:'light'});
 await page.goto('/settings#puppy-pointer-settings');
 await page.getByRole('radio',{name:'Follow device'}).check();
 await page.getByRole('radio',{name:'Match website'}).check();
 await expect(page.locator('html')).toHaveAttribute('data-puppy-cursor-theme','light');
 await expect(page.locator('.browser-pointer-preview img').first()).toHaveAttribute('src','/assets/pointers/themes/puppy_pointer_light_default_64.png');
 await page.emulateMedia({colorScheme:'dark'});
 await expect(page.locator('html')).toHaveAttribute('data-puppy-cursor-theme','dark');
 await expect(page.locator('.browser-pointer-preview img').first()).toHaveAttribute('src','/assets/pointers/themes/puppy_pointer_dark_default_64.png');
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
