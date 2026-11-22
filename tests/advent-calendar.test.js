import test from 'node:test';
import assert from 'node:assert/strict';
import {ADVENT_REWARDS,ADVENT_START,ADVENT_END,ADVENT_CLAIMS_KEY,adventClaims,adventPhase,adventDoorState,requireAdventReward} from '../supabase/functions/_shared/advent-calendar.js';
import {crossPlay} from '../supabase/functions/pup-web-auth/crossPlay.ts';
import {newBetaKotlinSave} from '../supabase/functions/_shared/beta-economy.ts';
import {projectKotlinCloudSave} from '../src/native/src/production/kotlinCloudPreview.js';
import {crossplayDb} from './helpers/crossplay-db.js';

test('25 doors and exact UTC event boundaries',()=>{
 assert.equal(ADVENT_REWARDS.length,25);
 assert.equal(new Set(ADVENT_REWARDS.map(r=>r.id)).size,25);
 assert.equal(adventPhase(ADVENT_START-1),'upcoming');
 assert.equal(adventPhase(ADVENT_START),'active');
 assert.equal(adventPhase(ADVENT_END-1),'active');
 assert.equal(adventPhase(ADVENT_END),'ended');
 assert.equal(adventDoorState(ADVENT_REWARDS[0],[],ADVENT_START),'available');
 assert.equal(adventDoorState(ADVENT_REWARDS[1],[],ADVENT_START),'locked');
 assert.equal(adventDoorState(ADVENT_REWARDS[0],[],ADVENT_END),'expired');
 assert.equal(adventDoorState(ADVENT_REWARDS[0],[ADVENT_REWARDS[0].id],ADVENT_END),'claimed');
 assert.equal(adventClaims(['2026-12-01','2026-12-01','2026-12-26','2027-12-01']).length,1);
 assert.throws(()=>requireAdventReward('2026-12-01',[],ADVENT_START-1),{message:'ADVENT_CLOSED'});
 assert.throws(()=>requireAdventReward('2026-12-25',[],ADVENT_START),{message:'ADVENT_DAY_LOCKED'});
 assert.throws(()=>requireAdventReward('2026-12-01',['2026-12-01'],ADVENT_START),{message:'ADVENT_ALREADY_CLAIMED'});
 assert.equal(requireAdventReward('2026-12-01',[],ADVENT_END-1).day,1);
 assert.equal(ADVENT_REWARDS[24].treats,10000);
});

const claim=(db,id,operationId,extra={})=>crossPlay(db.admin,db.account,{
 action:'gameplay',expectedRevision:db.row().revision,operationId,
 intent:{type:'claimAdvent',id,...extra}
});
test('authoritative account claim ignores client quantities and deduplicates across distinct operation IDs',async t=>{
 t.mock.method(Date,'now',()=>Date.UTC(2026,11,25,12));
 const db=crossplayDb(newBetaKotlinSave(),{webOnly:true});
 const day='2026-12-25';
 const first=await claim(db,day,'11111111-1111-4111-8111-111111111111',{amount:999999,now:0});
 assert.equal(first.saved,true);
 assert.equal(first.operationId,'11111111-1111-4111-8111-111111111111');
 const projected=projectKotlinCloudSave(first.cloud.saveJson);
 assert.deepEqual(projected.adventClaims,[day]);
 assert.equal(projected.treats,0);
 assert.equal(projected.bones,0);
 assert.equal(projected.pupCoins,0);
 const second=await claim(db,day,'22222222-2222-4222-8222-222222222222');
 assert.equal(second.duplicate,true);
 assert.equal(second.operationId,'22222222-2222-4222-8222-222222222222');
 assert.equal(db.writes(),1);
 assert.deepEqual(db.row().save_data.stores.puppy_clicker_save.values[ADVENT_CLAIMS_KEY],[day]);
 await claim(db,'2026-12-01','33333333-3333-4333-8333-333333333333');
 assert.equal(db.writes(),2);
 assert.equal(db.gifts().length,2);
 const id=db.gifts()[0].id;
 const redeem=operationId=>crossPlay(db.admin,db.account,{action:'gameplay',expectedRevision:db.row().revision,operationId,intent:{type:'claimInboxReward',id,amount:999999}});
 const result=await redeem('44444444-4444-4444-8444-444444444444');
 assert.equal(projectKotlinCloudSave(result.cloud.saveJson).treats,500);
 assert.equal((await redeem('55555555-5555-4555-8555-555555555555')).duplicate,true);
 assert.equal(db.writes(),3);
});
test('future and closed doors refuse claims, including forged client timestamps',async t=>{
 t.mock.method(Date,'now',()=>ADVENT_START);
 const db=crossplayDb(newBetaKotlinSave(),{webOnly:true});
 await assert.rejects(claim(db,'2026-12-25','11111111-1111-4111-8111-111111111111',{now:ADVENT_END-1}),{message:'ADVENT_DAY_LOCKED'});
 await assert.rejects(claim(db,'2026-12-26','22222222-2222-4222-8222-222222222222'),{message:'ADVENT_DAY_INVALID'});
 await assert.rejects(claim(db,'2026-12-01',undefined),{message:'PUP_OPERATION_ID_INVALID'});
 assert.equal(db.writes(),0);
});

test('administrative event switches reject new Advent claims without altering balances',async t=>{
 t.mock.method(Date,'now',()=>ADVENT_START);
 for(const eventSettings of [{all_events:false,christmas_2026:true,winter_effects:true},{all_events:true,christmas_2026:false,winter_effects:true}]){
  const db=crossplayDb(newBetaKotlinSave(),{webOnly:true,eventSettings});
  await assert.rejects(claim(db,'2026-12-01','11111111-1111-4111-8111-111111111111'),{message:'ADVENT_DISABLED'});assert.equal(db.writes(),0);
 }
});
