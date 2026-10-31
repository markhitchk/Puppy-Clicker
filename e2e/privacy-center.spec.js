import {test,expect} from '@playwright/test';

test('signed-out visitors can read privacy information but not submit a request',async({page})=>{
 await page.goto('/account/privacy');
 await expect(page.getByRole('heading',{name:/privacy & data/i})).toBeVisible();
 await expect(page.getByRole('link',{name:'Full privacy policy'})).toHaveAttribute('href','/legal/privacy');
 await expect(page.getByRole('link',{name:'Sign in to Pup Account'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Send request'})).toHaveCount(0);
});

test('privacy center fits a small phone',async({page})=>{
 await page.setViewportSize({width:360,height:780});
 await page.goto('/account/privacy');
 await expect(page.locator('.privacy-center')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test('website privacy notice points to account rights center',async({page})=>{
 await page.goto('/privacy');
 await expect(page.getByRole('link',{name:'Privacy Center'})).toHaveAttribute('href','/account/privacy');
});
