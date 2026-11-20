import {test,expect} from '@playwright/test';

test('test puppies are Common and claimable for free from /play',async({page})=>{
 await page.setViewportSize({width:360,height:780});
 await page.goto('/play');
 await page.getByRole('tab',{name:'🐶 Roster'}).click();
 await page.getByRole('combobox',{name:'Rarity'}).selectOption('common');
 const grid=page.getByTestId('puppy-roster-grid');
 const first=grid.locator('[data-pup-card="test_v1_crash_dummy"]');
 const second=grid.locator('[data-pup-card="test_v2_crash_dummy"]');
 for(const card of [first,second]){
  await expect(card).toBeVisible();
  await expect(card).toHaveAttribute('data-rarity','common');
  await expect(card.locator('.meet-puppy-badge-rarity')).toContainText('Common');
  await expect(card.getByRole('button')).toHaveCount(1);
  await expect(card.getByText('🔒 Locked')).toBeVisible();
 }
 const balance=await page.evaluate(()=>JSON.parse(localStorage.getItem('puppy_test_authoritative_kotlin_save_v1')||'null')?.saveData?.stores?.puppy_clicker_save?.values?.treats||0);
 for(const [card,version] of [[first,1],[second,2]]){
  await card.getByRole('button').click();
  await page.getByRole('button',{name:'Claim Crash Test Pup V'+version+' for free'}).click();
  await expect(page.getByRole('button',{name:'Claim Crash Test Pup V'+version+' for free'})).toHaveCount(0);
  await page.getByRole('button',{name:'Done',exact:true}).click();
  await expect(card.getByText('Unlocked',{exact:true})).toBeVisible();
 }
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('puppy_test_authoritative_kotlin_save_v1')||'null').saveData.stores.puppy_clicker_save.values);
 expect(saved.unlocked_puppies).toEqual(expect.arrayContaining(['test_v1_crash_dummy','test_v2_crash_dummy']));
 expect(saved.treats).toBe(balance);
});
