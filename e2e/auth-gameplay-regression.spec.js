import {test,expect} from '@playwright/test';
const saveKey='puppy_test_authoritative_kotlin_save_v1';
async function seeded(page,extra={}){
 await page.addInitScript(({saveKey,extra})=>{
  if(localStorage.getItem(saveKey))return;
  localStorage.setItem(saveKey,JSON.stringify({revision:1,saveData:{format:'puppy-clicker-cloud-save',version:1,
   stores:{puppy_clicker_save:{values:{puppy_name:'Buddy',puppy_style:'classic',unlocked_puppies:['classic','golden','poodle','spotty'],
    treats:10000,lifetime_treats:10000,casino_chips_v7:10000,upgrade_ticket_common:2,...extra},types:{}}}}}));
  localStorage.setItem('puppy-clicker:web-preferences:v1',JSON.stringify({animationsEnabled:false,reducedMotion:true}));
 },{saveKey,extra});
}
const balance=async(page,key)=>page.evaluate(({saveKey,key})=>JSON.parse(localStorage.getItem(saveKey)).saveData.stores.puppy_clicker_save.values[key],{saveKey,key});
async function rewards(page){await page.getByRole('button',{name:'🎁 Rewards & daily goals'}).click()}
async function casino(page){await rewards(page);await page.getByRole('button',{name:'Open',exact:true}).nth(1).click();await page.getByRole('button',{name:/Continue/}).click()}

test('OAuth callback completes once in Strict Mode and opens authenticated Play',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('puppy-web-discord-pkce-pending-v3',JSON.stringify({state:'pcw1_'+'s'.repeat(43),verifier:'v'.repeat(64),at:Date.now()})));
 let exchanges=0;
 await page.route('**/functions/v1/pup-web-auth',async route=>{
  exchanges++;await new Promise(r=>setTimeout(r,100));
  await route.fulfill({json:{token_hash:'test-puppy-token',otp_type:'magiclink'}});
 });
 await page.goto('/auth/discord/callback?signedout=1&code=discord-code-123456&state=pcw1_'+'s'.repeat(43));
 await expect(page).toHaveURL(/\/play$/);
 await expect(page.getByRole('button',{name:'Tap Buddy to earn Treats'})).toBeVisible();
 expect(exchanges).toBe(1);
});

test('denied callback stays on error page without login redirect or repeated exchange',async({page})=>{
 await page.goto('/auth/discord/callback?error=access_denied');
 await expect(page.getByRole('alert')).toContainText('cancelled');
 await expect(page).toHaveURL(/\/auth\/discord\/callback$/);
 await expect(page.getByRole('link',{name:'Return to sign-in'})).toBeVisible();
});

test('email callback is exchanged before displaying the recovery account',async({page})=>{
 await page.goto('/recovery?signedout=1&code=email-code-123456');
 await expect(page.getByText('Email link verified.',{exact:false})).toBeVisible();
 await expect(page).toHaveURL(/\/recovery$/);
});

test('Slots settles server payout and recovers on reload',async({page})=>{
 await seeded(page);await page.goto('/play');await casino(page);
 await page.getByRole('button',{name:/Puppy Slots.*Three-reel/}).click();
 await page.getByRole('button',{name:'Pull Lever · 100 Chips',exact:true}).click();
 await expect.poll(()=>balance(page,'beta_last_casino_result_v1')).toBeTruthy();
 const result=JSON.parse(await balance(page,'beta_last_casino_result_v1'));
 expect(await balance(page,'casino_chips_v7')).toBe(9900+result.payout);
 await page.reload();expect(await balance(page,'casino_chips_v7')).toBe(9900+result.payout);
});

test('gacha ignores double click, charges once and reveals an inventory puppy',async({page})=>{
 await seeded(page);await page.goto('/play');await rewards(page);
 await page.getByRole('button',{name:'Open',exact:true}).first().click();
 await page.route('**/__e2e/gameplay',async route=>{await new Promise(r=>setTimeout(r,200));await route.continue()});
 const pull=page.getByRole('button',{name:/Pull with Treats/});
 await pull.evaluate(el=>{el.click();el.click()});
 await expect.poll(()=>balance(page,'beta_gacha_pulls_v1')).toBe(1);
 expect(await balance(page,'treats')).toBe(7500);
 const result=JSON.parse(await balance(page,'beta_last_gacha_result_v1'));
 expect(await balance(page,'unlocked_puppies')).toContain(result.puppyId);
 await page.getByRole('button',{name:/Open Capsule/i}).click();
 await expect(page.getByText('NEW PUPPY!',{exact:true})).toBeVisible();
});

test('legacy Android wager shows recovery instructions and cannot start a web round',async({page})=>{
 await seeded(page,{casino_active_round_v1:JSON.stringify({schemaVersion:1,game:'BLACKJACK',state:'WAGER_ACCEPTED'})});
 await page.goto('/play');await casino(page);
 await expect(page.getByRole('alert')).toContainText('Android');
 await page.getByRole('button',{name:/Puppy Slots.*Three-reel/}).click();
 await expect(page.getByRole('button',{name:'Pull Lever · 100 Chips',exact:true})).toBeDisabled();
});

for(const query of ['nocloud','ownerrevoked'])test(query+' blocks web gameplay without redirecting to login',async({page})=>{
 await page.goto('/play?'+query+'=1');
 await expect(page.getByRole('alert')).toContainText('Android');
 await expect(page.getByRole('button',{name:'Tap Buddy to earn Treats'})).toHaveCount(0);
 await expect(page).toHaveURL('/play?'+query+'=1');
});

test('gacha shows insufficient-funds errors returned by the authoritative server',async({page})=>{
 await seeded(page);await page.goto('/play');await rewards(page);
 await page.getByRole('button',{name:'Open',exact:true}).first().click();
 // Model an Android balance change after the browser loaded its snapshot.
 await page.evaluate(saveKey=>{const r=JSON.parse(localStorage.getItem(saveKey));r.saveData.stores.puppy_clicker_save.values.treats=0;localStorage.setItem(saveKey,JSON.stringify(r))},saveKey);
 await page.getByRole('button',{name:/Pull with Treats/}).click();
 await expect(page.getByRole('alert')).toContainText('2,500 Treats');
 expect(await balance(page,'treats')).toBe(0);
 expect(await balance(page,'beta_gacha_pulls_v1')).toBeUndefined();
});

test('revision conflict reloads progress without replaying a gacha debit',async({page})=>{
 await seeded(page);await page.goto('/play');await rewards(page);
 await page.getByRole('button',{name:'Open',exact:true}).first().click();
 let writes=0;
 await page.route('**/__e2e/gameplay',async route=>{writes++;await route.fulfill({status:409,json:{error:'CLOUD_SAVE_CONFLICT'}})});
 await page.getByRole('button',{name:/Pull with Treats/}).click();
 await expect(page.getByRole('alert')).toContainText('another device');
 expect(writes).toBe(1);expect(await balance(page,'treats')).toBe(10000);
});

test('different care actions stay queued while the first response is delayed',async({page})=>{
 await seeded(page,{happiness:50,energy:50,fullness:50,cleanliness_v5:50,bond_v5:10});
 await page.goto('/play');await page.getByRole('button',{name:'Care',exact:true}).click();
 await page.route('**/__e2e/gameplay',async route=>{await new Promise(r=>setTimeout(r,150));await route.continue()});
 await page.getByRole('button',{name:'Feed, costs 20 Treats',exact:true}).click();
 await page.getByRole('button',{name:'Clean, costs 10 Treats',exact:true}).click();
 await expect.poll(()=>balance(page,'care_actions_v5')).toBe(2);
 expect(await balance(page,'treats')).toBe(9970);
});
