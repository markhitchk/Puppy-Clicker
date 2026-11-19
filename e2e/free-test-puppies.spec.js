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
  await expect(card.getByText('Free test puppy')).toBeVisible();
  await expect(card.getByRole('button',{name:/Claim Crash Test Pup V[12] for free/})).toBeVisible();
 }
 const balance=await page.evaluate(()=>JSON.parse(localStorage.getItem('puppy_test_authoritative_kotlin_save_v1')||'null')?.saveData?.stores?.puppy_clicker_save?.values?.treats||0);
 await first.getByRole('button',{name:'Claim Crash Test Pup V1 for free'}).click();
 await expect(first.getByText('Unlocked',{exact:true})).toBeVisible();
 await expect(first.getByRole('button',{name:'Claim Crash Test Pup V1 for free'})).toHaveCount(0);
 await second.getByRole('button',{name:'Claim Crash Test Pup V2 for free'}).click();
 await expect(second.getByText('Unlocked',{exact:true})).toBeVisible();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('puppy_test_authoritative_kotlin_save_v1')||'null').saveData.stores.puppy_clicker_save.values);
 expect(saved.unlocked_puppies).toEqual(expect.arrayContaining(['test_v1_crash_dummy','test_v2_crash_dummy']));
 expect(saved.treats).toBe(balance);
});
