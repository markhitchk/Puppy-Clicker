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
