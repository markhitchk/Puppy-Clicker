import {test,expect} from '@playwright/test';

test('puppy asset deep link opens a public in-game-style details dialog',async ({page})=>{
 await page.goto('/puppies?pup=v1_midnight');
 const dialog=page.locator('dialog.meet-puppy-dialog');
 await expect(dialog).toBeVisible();
 await expect(dialog.getByRole('heading',{name:'Puppy Details'})).toBeVisible();
 await expect(dialog.getByRole('heading',{name:'Midnight'})).toBeVisible();
 await expect(dialog.getByText('v1_midnight')).toBeVisible();
 await expect(dialog.getByText('A moonlit version of the original pup.')).toBeVisible();
 await expect(dialog.getByText('Special unlock')).toBeVisible();
 await dialog.getByRole('button',{name:'Close puppy details'}).click();
 await expect(dialog).toHaveCount(0);
 await expect(page).toHaveURL(/\/puppies$/);
});

test('public puppy cards open details without a reload, and Escape closes them',async ({page})=>{
 await page.goto('/puppies');
 const card=page.getByRole('link',{name:'View Midnight puppy details'});
 await expect(card).toHaveAttribute('href','/puppies?pup=v1_midnight');
 await card.click();
 await expect(page).toHaveURL(/\/puppies\?pup=v1_midnight$/);
 await expect(page.locator('dialog.meet-puppy-dialog')).toBeVisible();
 await page.keyboard.press('Escape');
 await expect(page.locator('dialog.meet-puppy-dialog')).toHaveCount(0);
 await expect(page).toHaveURL(/\/puppies$/);
});

test('asset aliases and home preview links resolve correctly',async ({page})=>{
 await page.goto('/puppies?=v1_midnight');
 await expect(page.locator('dialog.meet-puppy-dialog').getByRole('heading',{name:'Midnight'})).toBeVisible();
 await page.goto('/');
 await page.getByRole('link',{name:'View Buddy puppy details'}).click();
 await expect(page).toHaveURL(/\/puppies\?pup=v1_classic$/);
 await expect(page.locator('dialog.meet-puppy-dialog').getByRole('heading',{name:'Buddy'})).toBeVisible();
});
