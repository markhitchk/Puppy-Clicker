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
 await page.getByRole('switch',{name:'Puppy mouse cursor'}).uncheck();
 await expect(page.locator('html')).toHaveAttribute('data-puppy-cursor','disabled');
 await page.reload();
 await expect(page.getByRole('radio',{name:'Light',exact:true})).toBeChecked();
 await expect(page.getByRole('radio',{name:'Purple',exact:true})).toBeChecked();
 await expect(page.getByRole('switch',{name:'Puppy mouse cursor'})).not.toBeChecked();
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


test('pointer controls change raster cursor size, artwork and theme across routes',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await page.goto('/settings#puppy-pointer-settings');
 const root=page.locator('html');
 await expect(page.getByRole('heading',{name:'Puppy mouse pointer'})).toBeVisible();
 await page.getByRole('radio',{name:'Small · 32 px'}).check();
 await expect(root).toHaveAttribute('data-puppy-cursor-size','small');
 expect(await page.locator('body').evaluate(node=>getComputedStyle(node).cursor)).toContain('puppy_pointer_dark_default_32.png');
 const first=await page.request.get('/assets/pointers/sizes/puppy_pointer_dark_default_32.png');
 expect(first.ok()).toBe(true);
 const raw=await first.body();
 expect(raw.readUInt32BE(16)).toBe(32);
 expect(raw.readUInt32BE(20)).toBe(32);
 await page.getByRole('radio',{name:'Classic paw'}).check();
 await expect(root).toHaveAttribute('data-puppy-cursor-style','paw');
 expect(await page.locator('body').evaluate(node=>getComputedStyle(node).cursor)).toContain('paw_pointer_default_32.png');
 await page.getByRole('radio',{name:'Light cursor'}).check();
 await expect(root).toHaveAttribute('data-puppy-cursor-theme','light');
 await page.getByRole('switch',{name:'Highlight mouse clicks'}).check();
 await expect(root).toHaveAttribute('data-puppy-pointer-halo','enabled');
 await page.reload();
 await expect(page.getByRole('radio',{name:'Small · 32 px'})).toBeChecked();
 await expect(page.getByRole('radio',{name:'Classic paw'})).toBeChecked();
 await expect(page.getByRole('radio',{name:'Light cursor'})).toBeChecked();
 await expect(page.getByRole('switch',{name:'Highlight mouse clicks'})).toBeChecked();
 await page.goto('/');
 await expect(root).toHaveAttribute('data-puppy-cursor-size','small');
 await expect(root).toHaveAttribute('data-puppy-cursor-style','paw');
 await page.goto('/settings#puppy-pointer-settings');
 await page.getByRole('button',{name:'Reset pointer customization'}).click();
 await expect(root).toHaveAttribute('data-puppy-cursor-size','large');
 await expect(root).toHaveAttribute('data-puppy-cursor-style','puppy');
 await expect(root).toHaveAttribute('data-puppy-pointer-halo','disabled');
});
