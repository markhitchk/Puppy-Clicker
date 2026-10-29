import {test,expect} from '@playwright/test';
const saveKey='puppy_test_authoritative_kotlin_save_v1';
async function setup(page,extra={}){
 await page.setViewportSize({width:1280,height:800});
 await page.addInitScript(({saveKey,extra})=>{
  if(!localStorage.getItem(saveKey))localStorage.setItem(saveKey,JSON.stringify({revision:1,saveData:{format:'puppy-clicker-cloud-save',version:1,
   stores:{puppy_clicker_save:{values:{puppy_name:'Buddy',puppy_style:'classic',casino_chips_v7:10000,treats:10000,...extra},types:{}}}}}));
  localStorage.setItem('puppy-clicker:web-preferences:v1',JSON.stringify({animationsEnabled:false,reducedMotion:true}));
 },{saveKey,extra});
 await page.goto('/play');await openCasino(page);
}
async function openCasino(page){
 await page.getByRole('button',{name:'🎁 Rewards & daily goals'}).click();
 await page.getByRole('button',{name:'Open',exact:true}).nth(1).click();
 await page.getByRole('button',{name:/Continue/}).click();
}
const value=(page,key)=>page.evaluate(({saveKey,key})=>JSON.parse(localStorage.getItem(saveKey)).saveData.stores.puppy_clicker_save.values[key],{saveKey,key});
for(const [game,start] of [
 ['Puppy Slots','Pull Lever · 100 Chips'],['Puppy Roulette','Spin Red · 100 Chips'],
 ['Puppy Plinko','Drop Ball · 20 Chips'],['Lucky Pup Wheel','Spin Wheel · 20 Chips']
])test(game+' starts and reveals a server result',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await setup(page);
 await page.getByRole('button',{name:new RegExp(game+'.*')}).click();
 await page.getByRole('button',{name:start,exact:true}).click();
 await expect.poll(()=>value(page,'beta_last_casino_result_v1')).toBeTruthy();
 const result=JSON.parse(await value(page,'beta_last_casino_result_v1'));
 expect(await value(page,'casino_chips_v7')).toBe(10000-result.wager+result.payout);
 expect(await value(page,'beta_casino_round_v1')).toBe('');
 expect(errors).toEqual([]);
});

test('Scratchers can be cleared with a mouse and settle once',async({page})=>{
 await setup(page);await page.getByRole('button',{name:/Puppy Scratchers.*Choose/}).click();
 await page.getByRole('button',{name:'Buy Pup Scratch · 20 Chips',exact:true}).click();
 const coating=page.getByTestId('puppy-scratch-coating');
 await expect(coating).toHaveAttribute('aria-label',/0 percent cleared/);
 await expect.poll(()=>value(page,'beta_casino_round_v1')).toBeTruthy();
 await coating.scrollIntoViewIfNeeded();const box=await coating.boundingBox();
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
 for(let row=0;row<12;row++){
  const y=box.y+Math.min(box.height-2,2+row*(box.height-4)/11);
  await page.mouse.move(box.x+(row%2?box.width-2:2),y);
  await page.mouse.move(box.x+(row%2?2:box.width-2),y,{steps:18});
 }
 await page.mouse.up();
 await expect.poll(()=>value(page,'beta_last_casino_result_v1')).toBeTruthy();
 const result=JSON.parse(await value(page,'beta_last_casino_result_v1'));
 expect(await value(page,'casino_chips_v7')).toBe(9980+result.payout);
 await expect(page.getByText(/Card revealed/)).toBeVisible();
});

test('Blackjack deals, stands and displays the server settlement',async({page})=>{
 await setup(page);await page.getByRole('button',{name:/Puppy Blackjack.*Hit/}).click();
 await page.getByRole('button',{name:'Deal for 100 Chips',exact:true}).click();
 await expect.poll(async()=>Boolean(await value(page,'beta_casino_round_v1')||await value(page,'beta_last_blackjack_result_v1'))).toBe(true);
 if(await value(page,'beta_casino_round_v1'))await page.getByRole('button',{name:'STAND',exact:true}).click();
 await expect.poll(()=>value(page,'beta_last_blackjack_result_v1')).toBeTruthy();
 const result=JSON.parse(await value(page,'beta_last_blackjack_result_v1'));
 expect(await value(page,'casino_chips_v7')).toBe(9900+result.outcome.totalPayout);
 await expect(page.getByText(/Round complete ·/)).toBeVisible();
});

test('old Blackjack recovery returns reserved Chips and unlocks every game',async({page})=>{
 const cards=Array.from({length:52},(_,i)=>i);
 await setup(page,{casino_active_round_v1:JSON.stringify({schemaVersion:1,roundId:'legacy-blackjack-test-123',game:'BLACKJACK',
  state:'WAGER_ACCEPTED',wagerTreats:100,acceptedAtMs:Date.now()-7*86400000,payoutTreats:0,outcomeCommittedAtMs:0,
  wagerPayload:JSON.stringify({schemaVersion:1,game:'BLACKJACK',remainingDeck:cards.slice(4),dealerCards:cards.slice(0,2),hands:[{cards:cards.slice(2,4),wagerTreats:100,stood:false,doubled:false,fromSplit:false,splitAces:false}],activeHandIndex:0,complete:false})})});
 await page.getByRole('button',{name:'Recover old round · Return 100 Chips',exact:true}).click();
 await expect.poll(()=>value(page,'casino_chips_v7')).toBe(10100);
 await expect(page.getByRole('alert')).toContainText('Old round recovered');
 await page.getByRole('button',{name:/Puppy Slots.*Three-reel/}).click();
 await expect(page.getByRole('button',{name:'Pull Lever · 100 Chips',exact:true})).toBeEnabled();
 await page.getByRole('button',{name:'Pull Lever · 100 Chips',exact:true}).click();
 await expect.poll(()=>value(page,'beta_last_casino_result_v1')).toBeTruthy();
});

for(const path of ['/','/play','/account','/recovery'])test('inspection deterrents apply on '+path,async({page})=>{
 await page.goto(path);
 await expect.poll(()=>page.evaluate(()=>!document.dispatchEvent(new KeyboardEvent('keydown',{key:'F12',cancelable:true,bubbles:true})))).toBe(true);
 expect(await page.evaluate(()=>!document.dispatchEvent(new MouseEvent('contextmenu',{cancelable:true,bubbles:true})))).toBe(true);
 expect(await page.evaluate(()=>document.dispatchEvent(new KeyboardEvent('keydown',{key:'c',ctrlKey:true,cancelable:true,bubbles:true})))).toBe(true);
});

test('Scratchers accepts touch dragging on a phone viewport',async({page})=>{
 await setup(page);await page.setViewportSize({width:390,height:844});
 await page.getByRole('button',{name:/Puppy Scratchers.*Choose/}).click();
 await page.getByRole('button',{name:'Buy Pup Scratch · 20 Chips',exact:true}).click();
 await expect.poll(()=>value(page,'beta_casino_round_v1')).toBeTruthy();
 const coating=page.getByTestId('puppy-scratch-coating');await coating.scrollIntoViewIfNeeded();
 const box=await coating.boundingBox();const session=await page.context().newCDPSession(page);
 await session.send('Emulation.setTouchEmulationEnabled',{enabled:true});
 const point=(x,y)=>({x,y,id:1});
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point(box.x+box.width/2,box.y+box.height/2)]});
 for(let row=0;row<10;row++){
  const y=box.y+8+row*(box.height-16)/9;
  for(let step=0;step<15;step++){
   const fraction=row%2?1-step/14:step/14;
   await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point(box.x+8+fraction*(box.width-16),y)]});
  }
 }
 await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await expect.poll(()=>value(page,'beta_last_casino_result_v1')).toBeTruthy();
});
