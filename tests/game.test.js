import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  freshGame, ROSTER, UPGRADES, cost, boneCost, ticketCost, purchase,
  tap, passive, care, handValue, sanitizeGame, convertTreatsToChips,
  switchPuppy, claimDailyReward, ticketShopCost
} from '../src/game.js';

// Contracts sourced from PuppyEconomyV7.kt, PuppyClickerV6ViewModel.kt,
// PuppyCareSystem.kt, PuppyProgression.kt in markhitchk/pup-clinker.
test('v6 roster keeps source game IDs and artwork',()=>{
  assert.ok(ROSTER.length>=29);
  assert.equal(new Set(ROSTER.map(p=>p.id)).size,ROSTER.length);
  assert.match(ROSTER[0].image,/v1_classic\.(png|svg)$/);
  assert.ok(ROSTER.some(p=>p.id==='v2_discord_pup'));
});
test('healthy initial puppy earns base + care bonus',()=>{
  const g=freshGame();tap(g,10_000,()=>0.5);
  assert.equal(g.treats,2);assert.equal(g.totalTaps,1);
});
test('passive production is disabled, including offline time',()=>{
  const g=freshGame();g.activeBonus=100;
  passive(g,14_400);
  assert.equal(g.treats,0);
});
test('10-tap active bonus, bone after 20 and coin after 250',()=>{
  const g=freshGame();g.activeBonus=5;
  for(let i=1;i<=250;i++)tap(g,i*1_000,()=>0.5);
  assert.equal(g.legitimateTaps,250);
  assert.equal(g.bones,12);
  assert.equal(g.pupCoins,1);
  // 250 taps at 2 (base + care while healthy), +25 x 5 active bonus.
  assert.ok(g.treats>=375);
  assert.equal(g.totalTaps,250);
});
test('ticket drops use 1/500 denominator with Android rarity weights',()=>{
  const g=freshGame();
  assert.equal(tap(g,20_000,()=>0), 'COMMON');
  assert.equal(g.ticketInventory.COMMON,1);
  assert.equal(g.totalTicketsFound,1);
});
test('V7 upgrade prices use integer ceil 1.55x or 1.35x, and Bones',()=>{
  const g=freshGame();
  const cookie=UPGRADES.find(u=>u.id==='better_treats');
  const ticket=UPGRADES.find(u=>u.id==='puppy_power');
  assert.equal(cost(g,cookie),35);
  assert.equal(cost(g,ticket),250);
  assert.equal(boneCost(cookie),1);
  assert.equal(boneCost(ticket),14);
  g.upgrades.better_treats=1;
  assert.equal(cost(g,cookie),55); // ceil(35*155/100)
});
test('upgrade requires Bones and grants active bonus, not passive income',()=>{
  const g=freshGame();g.treats=1000;const u=UPGRADES.find(v=>v.id==='chew_toy');
  assert.equal(purchase(g,u),false);
  g.bones=1;
  assert.equal(purchase(g,u),true);
  assert.equal(g.activeBonus,1);assert.equal(g.autoPerSecond,0);
});
test('Treats convert 10:1 into Casino Chips with exact multiples only',()=>{
  const g=freshGame();g.treats=140;
  assert.equal(convertTreatsToChips(g,15),false);
  assert.equal(convertTreatsToChips(g,100),true);
  assert.equal(g.treats,40);assert.equal(g.casinoChips,10);
});
test('Puppy care charges correct currencies',()=>{
  const g=freshGame();g.fullness=60;g.treats=20;
  assert.equal(care(g,'feed'),true);
  assert.equal(g.treats,0);assert.equal(g.fullness,85);
  g.energy=60;g.happiness=50;g.bones=1;
  assert.equal(care(g,'play'),true);
  assert.equal(g.bones,0);assert.equal(g.energy,48);
});
test('care state belongs to the individual puppy',()=>{
  const g=freshGame();g.fullness=37;
  switchPuppy(g,'golden');assert.equal(g.fullness,100);
  g.energy=17;
  switchPuppy(g,'classic');assert.equal(g.fullness,37);assert.equal(g.energy,100);
  switchPuppy(g,'golden');assert.equal(g.energy,17);
});
test('daily rewards add Treats, Bones and Pup Coins once a day',()=>{
  const g=freshGame();
  assert.equal(claimDailyReward(g,20000),true);
  assert.equal(g.bones,2);assert.equal(g.pupCoins,3);
  assert.equal(claimDailyReward(g,20000),false);
});
test('ticket shop scales V7 Pup Coin costs',()=>{
  assert.equal(ticketShopCost('COMMON',0),250);
  assert.equal(ticketShopCost('COMMON',1),312);
});
test('blackjack scores aces correctly',()=>{
  assert.equal(handValue([1,1,9]),21);
});
test('invalid saves cannot unlock invented puppies',()=>{
  const g=sanitizeGame({treats:-1,clickPower:-4,unlockedPuppies:['fake']});
  assert.equal(g.treats,0);assert.equal(g.clickPower,1);assert.deepEqual(g.unlockedPuppies,['classic']);
});
