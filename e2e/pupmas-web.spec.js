import {test,expect} from '@playwright/test';

for(const width of [390,768,1440]){
 test('Pupmas page keeps existing website styling and selectable days at '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:844});
  await page.goto('/events/pupmas');
  await expect(page.getByRole('heading',{name:/Pupmas 2026/})).toBeVisible();
  await expect(page.locator('.pupmas-day-grid button')).toHaveCount(25);
  await expect(page.getByRole('heading',{name:'Christmas Theme Pack'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Claiming not enabled yet'})).toBeDisabled();
  await page.getByRole('button',{name:/Day 25,/}).click();
  await expect(page.getByRole('heading',{name:'Legendary Pupmas Gift Box'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 });
}

test('seasonal browser toggle persists and does not grant rewards',async({page})=>{
 await page.goto('/settings#pupmas-theme-settings');
 const seasonal=page.getByRole('switch',{name:'Pupmas Christmas theme'});
 await expect(seasonal).toBeChecked();
 await seasonal.uncheck();
 await expect(seasonal).not.toBeChecked();
 await page.reload();
 await expect(seasonal).not.toBeChecked();
 await page.getByRole('link',{name:'🎁 View Pupmas Advent Calendar'}).click();
 await expect(page).toHaveURL(/\/events\/pupmas$/);
 await expect(page.getByRole('button',{name:'Claiming not enabled yet'})).toBeDisabled();
});
