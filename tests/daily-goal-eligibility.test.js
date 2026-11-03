import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {crossPlay} from '../supabase/functions/pup-web-auth/crossPlay.ts';
import {newBetaKotlinSave} from '../supabase/functions/_shared/beta-economy.ts';
import {crossplayDb} from './helpers/crossplay-db.js';
import {UPGRADES} from '../src/native/src/engine/game.js';
import {fallbackGoals,webServerRewardsDate} from '../src/native/src/engine/monthlyRewards.js';
import {hasCompletedUpgradeShop,webGoalState} from '../src/native/web/webGoalState.js';

globalThis.Deno={env:{get:()=> 'unit-test-only-casino-secret-at-least-24-characters'}};
const today=Date.parse('2026-11-03T12:00:00Z');
const base=()=>{
 const save=newBetaKotlinSave(today);
 Object.assign(save.stores.puppy_clicker_save.values,{
  treats:10000,bones_v7:1000,pup_coins_v7:1000,
  player_xp_v1:500,happiness:80,fullness:75,energy:70,cleanliness_v5:75
 });
 return save;
};
const values=db=>db.row().save_data.stores.puppy_clicker_save.values;
const play=(db,intent)=>crossPlay(db.admin,db.account,{action:'gameplay',expectedRevision:db.row().revision,intent});
const withFixedDay=async(t,body)=>{
 t.mock.method(Date,'now',()=>today);
 t.mock.method(globalThis,'fetch',async()=>{throw Error('offline in test: use deterministic fallback schedule')});
 await body();
};
test('the November 3 schedule displays the reported Tap/Care/Shop requirements',()=>{
 const goals=fallbackGoals(3);
 assert.deepEqual(goals.slice(0,3).map(g=>[g.id,g.target,g.rewardTreats]),[
  ['tap_time',90,360],['good_care',5,350],['shop_visit',1,400]
 ]);
});
test('maxed upgrades legitimately satisfy Shop Visit without fabricating purchases',async t=>withFixedDay(t,async()=>{
 const save=base(),v=save.stores.puppy_clicker_save.values;
 for(const u of UPGRADES)v['upgrade_'+u.id]=100;
 const db=crossplayDb(save);
 const before=values(db).treats;
 const receipt=await play(db,{type:'claimDailyGoal',goalId:'shop_visit'});
 assert.equal(receipt.saved,true);
 assert.equal(values(db).treats,before+400);
 assert.equal(values(db).total_shop_purchases_v5,0);
 assert.ok(values(db).daily_tasks_v5.includes('shop_visit'));
 await assert.rejects(play(db,{type:'claimDailyGoal',goalId:'shop_visit'}),{message:'GOAL_ALREADY_CLAIMED'});
 assert.equal(db.writes(),1);
 const projected=values(db);
 assert.equal(hasCompletedUpgradeShop({upgrades:Object.fromEntries(UPGRADES.map(u=>[u.id,projected['upgrade_'+u.id]]))}),true);
}));
test('non-maxed players must still actually buy an upgrade to claim Shop Visit',async t=>withFixedDay(t,async()=>{
 const db=crossplayDb(base());
 await assert.rejects(play(db,{type:'claimDailyGoal',goalId:'shop_visit'}),{message:'GOAL_NOT_COMPLETE'});
 const purchased=await play(db,{type:'purchase',upgradeId:'better_treats'});
 assert.equal(purchased.saved,true);
 assert.equal(values(db).total_shop_purchases_v5,1);
 const claimed=await play(db,{type:'claimDailyGoal',goalId:'shop_visit'});
 assert.equal(claimed.saved,true);
 assert.equal(values(db).daily_tasks_v5.includes('shop_visit'),true);
}));
test('tap task unlocks only after 90 server-confirmed taps, never before',async t=>withFixedDay(t,async()=>{
 const save=base(),v=save.stores.puppy_clicker_save.values;
 v.total_taps=89;v.legitimate_taps_v7=89;v.beta_last_tap_at_v1=today-1000;
 const db=crossplayDb(save);
 await assert.rejects(play(db,{type:'claimDailyGoal',goalId:'tap_time'}),{message:'GOAL_NOT_COMPLETE'});
 assert.equal((await play(db,{type:'tap'})).saved,true);
 assert.equal(values(db).total_taps,90);
 const receipt=await play(db,{type:'claimDailyGoal',goalId:'tap_time'});
 assert.equal(receipt.saved,true);
 assert.ok(values(db).daily_tasks_v5.includes('tap_time'));
}));
test('care goal unlocks after 5 legitimate care actions',async t=>withFixedDay(t,async()=>{
 const save=base(),v=save.stores.puppy_clicker_save.values;
 v.care_actions_v5=4;
 const db=crossplayDb(save);
 await assert.rejects(play(db,{type:'claimDailyGoal',goalId:'good_care'}),{message:'GOAL_NOT_COMPLETE'});
 assert.equal((await play(db,{type:'care',kind:'rest'})).saved,true);
 assert.equal(values(db).care_actions_v5,5);
 assert.equal((await play(db,{type:'claimDailyGoal',goalId:'good_care'})).saved,true);
}));
test('website shows remaining work and actionable routes instead of inert Claim buttons',()=>{
 const g= {upgrades:Object.fromEntries(UPGRADES.map(u=>[u.id,0])),
  dailyDay:Math.floor(today/86400000),totalTaps:49,dailyTapStart:0,
  careActions:0,dailyCareStart:0,totalShopPurchases:0,dailyShopStart:0};
 const date=webServerRewardsDate(today);
 const goals=fallbackGoals(3);
 const tap=webGoalState(g,goals[0],date);
 assert.equal(tap.progress,49);assert.equal(tap.remaining,41);assert.equal(tap.complete,false);
 assert.equal(tap.destination,'play');assert.equal(tap.continueLabel,'Go to Play');
 const care=webGoalState(g,goals[1],date);
 assert.equal(care.remaining,5);assert.equal(care.continueLabel,'Go to Care');
 const shop=webGoalState(g,goals[2],date);
 assert.equal(shop.remaining,1);assert.equal(shop.continueLabel,'Go to Shop');
 const maxed={...g,upgrades:Object.fromEntries(UPGRADES.map(u=>[u.id,100]))};
 assert.equal(webGoalState(maxed,goals[2],date).complete,true);
 assert.equal(webGoalState(maxed,goals[2],date).progress,1);
 assert.equal(webGoalState({...maxed,upgrades:{...maxed.upgrades,better_treats:99}},goals[2],date).complete,false);
 const app=readFileSync(new URL('../src/native/App.jsx',import.meta.url),'utf8');
 assert.match(app,/onOpen\?\.\(destination\)/);
 assert.match(app,/complete\?'Claim Reward':continueLabel/);
 assert.match(app,/goal-progress-hint/);
});
