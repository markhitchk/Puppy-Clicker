import test from 'node:test';
import assert from 'node:assert/strict';
import {crossPlay,publicCloudSnapshot} from '../supabase/functions/pup-web-auth/crossPlay.ts';
import {newBetaKotlinSave} from '../supabase/functions/_shared/beta-economy.ts';
import {projectKotlinCloudSave} from '../src/native/src/production/kotlinCloudPreview.js';
import {transition,initialState} from '../src/native/src/state/reducer.js';
import {crossplayDb} from './helpers/crossplay-db.js';

globalThis.Deno={env:{get:()=> 'unit-test-only-casino-secret-at-least-24-characters'}};
const seed=()=>{
 const save=newBetaKotlinSave();
 Object.assign(save.stores.puppy_clicker_save.values,{treats:10000,casino_chips_v7:10000,upgrade_ticket_common:3,unknown_android_field:'preserved'});
 return save;
};
const values=db=>db.row().save_data.stores.puppy_clicker_save.values;
const play=(db,intent,revision=db.row()?.revision)=>crossPlay(db.admin,db.account,{action:'gameplay',expectedRevision:revision,intent});
const view=receipt=>transition(initialState(),{type:'hydrate',readOnly:true,game:projectKotlinCloudSave(receipt.cloud.saveJson)});

test('legacy Android casino blocks new wagers with recovery code and hides its deck',async()=>{
 const save=seed();
 save.stores.puppy_clicker_save.values.casino_active_round_v1=JSON.stringify({schemaVersion:1,game:'BLACKJACK',state:'WAGER_ACCEPTED',wagerPayload:'PRIVATE_ANDROID_SHOE'});
 const db=crossplayDb(save);
 const snapshot=publicCloudSnapshot(db.row());
 assert.doesNotMatch(snapshot.saveJson,/PRIVATE_ANDROID_SHOE/);
 assert.deepEqual(JSON.parse(snapshot.saveJson).webCompanion,{nativeCasinoPending:true});
 await assert.rejects(play(db,{type:'slotsStart',wager:100}),{message:'PUP_CASINO_ANDROID_ROUND_PENDING'});
 assert.equal(db.writes(),0);
 assert.ok(values(db).casino_active_round_v1.includes('PRIVATE_ANDROID_SHOE'));
});

for(const [start,reveal,field] of [
 ['slotsStart','slotsReveal','pendingSlots'],['rouletteStart','rouletteReveal','pendingRoulette'],
 ['plinkoStart','plinkoReveal','pendingPlinko'],['scratchStart','scratchReveal','pendingScratch'],
 ['wheelStart','wheelReveal','pendingWheel']
])test(start+' debits, projects and settles once using server RNG',async t=>{
 const db=crossplayDb(seed());
 t.mock.method(crypto,'getRandomValues',array=>{array.fill(0);return array});
 const started=await play(db,{type:start,wager:100,bet:{type:'RED'},roll:99,payout:999999,deck:[],balance:999999});
 const pending=view(started).game[field];
 assert.ok(pending,field+' must survive projection and hydration');
 assert.equal(values(db).casino_chips_v7,9900);
 const settled=await play(db,{type:reveal,payout:999999});
 assert.equal(values(db).casino_chips_v7,9900+pending.payout);
 assert.equal(values(db).beta_casino_round_v1,'');
 assert.equal(values(db).unknown_android_field,'preserved');
 assert.equal(settled.cloud.revision,3);
 await assert.rejects(play(db,{type:reveal}));
 assert.equal(db.writes(),2);
});

test('gacha charges Treats or one ticket, updates inventory, and never grants protected puppies',async t=>{
 t.mock.method(crypto,'getRandomValues',array=>{array.fill(0);return array});
 const db=crossplayDb(seed());
 const first=view(await play(db,{type:'gacha',payment:'TREATS',puppyId:'v2_dev_pup',roll:999}));
 assert.equal(values(db).treats,7500);
 assert.equal(first.gachaResult.isNewUnlock,true);
 assert.ok(first.game.unlockedPuppies.includes(first.gachaResult.puppyId));
 const second=view(await play(db,{type:'gacha',payment:'COMMON_TICKET'}));
 assert.equal(values(db).upgrade_ticket_common,2);
 assert.equal(values(db).treats,7500);
 assert.notEqual(second.gachaResult.puppyId,first.gachaResult.puppyId);
 assert.ok(!values(db).unlocked_puppies.includes('v2_dev_pup'));
 const duplicate=view(await play(db,{type:'gacha',payment:'TREATS'}));
 assert.equal(duplicate.gachaResult.isNewUnlock,false);
 assert.equal(values(db).treats,5000);
});

test('owner, missing save, insufficient funds, revision and CAS failures never write',async()=>{
 await assert.rejects(play(crossplayDb(seed(),{owner:false}),{type:'gacha',payment:'TREATS'}),{message:'PUP_OWNER_DEVICE_UNAVAILABLE'});
 await assert.rejects(play(crossplayDb(null),{type:'gacha',payment:'TREATS'},1),{message:'CLOUD_SAVE_REQUIRED'});
 const db=crossplayDb(seed());
 await assert.rejects(play(db,{type:'slotsStart',wager:999999}));
 await assert.rejects(play(db,{type:'gacha',payment:'TREATS'},0));
 await assert.rejects(play(db,{type:'gacha',payment:'TREATS'},2),{message:'CLOUD_SAVE_CONFLICT'});
 const race=crossplayDb(seed(),{race:true});
 await assert.rejects(play(race,{type:'gacha',payment:'TREATS'}),{message:'CLOUD_SAVE_CONFLICT'});
 assert.equal(db.writes(),0);assert.equal(race.writes(),0);
});

test('concurrent gacha requests at the same revision allow only one debit',async()=>{
 const db=crossplayDb(seed());
 const outcomes=await Promise.allSettled([
  play(db,{type:'gacha',payment:'TREATS'},1),play(db,{type:'gacha',payment:'TREATS'},1)
 ]);
 assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);
 assert.equal(values(db).treats,7500);assert.equal(db.writes(),1);
});

test('Blackjack server deals no future shoe, supports hit/stand/double/split, and settles once',async t=>{
 // Select deterministic server round IDs for each legal move; no client deck is used.
 for(const move of ['blackjackHit','blackjackStand','blackjackDouble','blackjackSplit']){
  let db,started;
  for(let i=0;i<500;i++){
   const id='00000000-0000-4000-8000-'+String(i).padStart(12,'0');
   const mock=t.mock.method(crypto,'randomUUID',()=>id);
   db=crossplayDb(seed());started=await play(db,{type:'blackjackStart',wager:100,deck:[0,1,2,3]});
   mock.mock.restore();
   const round=view(started).blackjack;
   if(round&&(move!=='blackjackSplit'||round.hands[0].cards[0]%13===round.hands[0].cards[1]%13))break;
  }
  assert.ok(view(started).blackjack,move);
  const publicRound=JSON.parse(JSON.parse(started.cloud.saveJson).stores.puppy_clicker_save.values.beta_casino_round_v1);
  assert.equal(publicRound.remainingDeck,undefined);assert.equal(publicRound.dealerCards.length,1);
  const after=await play(db,{type:move,payout:999999});
  if(move==='blackjackDouble'||move==='blackjackSplit'){
   const round=view(after).blackjack||view(after).blackjackDisplay?.state;
   assert.equal(round.hands.reduce((n,h)=>n+h.wager,0),200);
  }
  while(values(db).beta_casino_round_v1)await play(db,{type:'blackjackStand'});
  const settled=values(db).casino_chips_v7;
  await assert.rejects(play(db,{type:'blackjackStand'}));
  assert.equal(values(db).casino_chips_v7,settled);
 }
});
