import {test,expect} from '@playwright/test';
for(const [device,width,height] of [['phone',360,780],['Chromebook-sized',1366,768],['desktop',1680,1050]]){
 test(device+' PupDex can filter and inspect restricted puppies',async({page})=>{
  await page.setViewportSize({width,height});
  await page.goto('/puppies');
  await page.getByRole('combobox',{name:'Rarity',exact:true}).selectOption('unobtainable');
  await expect(page.locator('.meet-puppy-card')).toHaveCount(3);
  await page.getByRole('link',{name:'View HarleyTG Puppy puppy details'}).click();
  const dialog=page.getByRole('dialog');
  await expect(dialog.getByText('🔒 Unobtainable')).toBeVisible();
  await expect(dialog.getByText('Unavailable through gameplay')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
 });
}
