import {test,expect} from '@playwright/test';
test('all six casino screens stay playable and Blackjack survives navigation',async({page})=>{
 await page.addInitScript(()=>{Math.random=()=>0.5;});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await page.getByRole('button',{name:'Start playing'}).click();
 await page.getByRole('button',{name:'Care',exact:true}).click();await page.getByRole('button',{name:'🎁 Rewards',exact:true}).click();
 await page.getByRole('button',{name:'Claim Daily Puppy Gift'}).click();await page.getByRole('button',{name:'Claim Healthy Pup'}).click();
 await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('button',{name:'Puppy Casino',exact:true}).click();
 await page.getByRole('textbox',{name:'Treats to convert'}).fill('600');await page.getByRole('button',{name:'Convert 60 Chips'}).click();
 for(const name of ['🎰 Puppy Slots','🎡 Pup Roulette','🔵 Pup Plinko','🐾 Lucky Pup Wheel','🎟️ Pup Scratchers']){
  await page.getByRole('button',{name:'Open '+name,exact:true}).click();
  await page.getByRole('button',{name:name.includes('Plinko')?'Drop ball · 20 Chips':name.includes('Scratchers')?'New scratch card · 20 Chips':'Spin · 20 Chips',exact:true}).click();
  if(name.includes('Scratchers'))await page.getByRole('button',{name:'Reveal scratch card'}).click();
  await page.getByRole('button',{name:'‹ Casino',exact:true}).click();
 }
 await page.getByRole('button',{name:'Open ♠️ Puppy Blackjack',exact:true}).click();
 await page.getByRole('button',{name:'Deal · 20',exact:true}).click();
 await page.getByRole('button',{name:'‹ Casino',exact:true}).click();await page.getByRole('button',{name:'Open ♠️ Puppy Blackjack',exact:true}).click();
 await expect(page.getByText('Hand 1 ·',{exact:false})).toBeVisible();
 if(await page.getByRole('button',{name:'Stand',exact:true}).isEnabled())await page.getByRole('button',{name:'Stand',exact:true}).click();
 await expect(page.getByText('Hand complete ·',{exact:false})).toBeVisible();
 expect(errors).toEqual([]);await page.screenshot({path:'test-results/blackjack-shared.png'});
});
