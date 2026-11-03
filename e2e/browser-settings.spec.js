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
