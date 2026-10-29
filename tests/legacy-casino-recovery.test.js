import test from 'node:test';
import assert from 'node:assert/strict';
import {crossPlay,publicCloudSnapshot} from '../supabase/functions/pup-web-auth/crossPlay.ts';
import {newBetaKotlinSave} from '../supabase/functions/_shared/beta-economy.ts';
import {crossplayDb} from './helpers/crossplay-db.js';
const id='legacy-blackjack-round-123';
const seed=(round={},values={})=>{
 const save=newBetaKotlinSave();
 const cards=Array.from({length:52},(_,i)=>i);
 Object.assign(save.stores.puppy_clicker_save.values,{
  casino_chips_v7:500,unknown_android_field:'preserved',
  casino_active_round_v1:JSON.stringify({schemaVersion:1,roundId:id,game:'BLACKJACK',
   state:'WAGER_ACCEPTED',wagerTreats:100,acceptedAtMs:Date.now()-7*86400000,
   payoutTreats:0,outcomeCommittedAtMs:0,
   wagerPayload:JSON.stringify({schemaVersion:1,game:'BLACKJACK',remainingDeck:cards.slice(4),dealerCards:cards.slice(0,2),
    hands:[{cards:cards.slice(2,4),wagerTreats:100,stood:false,doubled:false,fromSplit:false,splitAces:false}],activeHandIndex:0,complete:false}),...round}),...values});
 return save;
};
const play=(db,intent={type:'casinoRecoverLegacy'},revision=db.row().revision)=>crossPlay(db.admin,db.account,{action:'gameplay',expectedRevision:revision,intent});
const values=db=>db.row().save_data.stores.puppy_clicker_save.values;

test('web recovery refunds the old reserved chips once and permits a fresh server round',async()=>{
 const db=crossplayDb(seed());
 const receipt=await play(db,{type:'casinoRecoverLegacy',amount:999999,payout:999999});
 assert.equal(values(db).casino_chips_v7,600);
 assert.equal(values(db).casino_active_round_v1,undefined);
 assert.deepEqual(JSON.parse(values(db).casino_completed_round_ids_v1),[id]);
 assert.equal(JSON.parse(values(db).beta_legacy_casino_recovery_v1).refund,100);
 assert.equal(values(db).unknown_android_field,'preserved');
 assert.doesNotMatch(receipt.cloud.saveJson,/remainingDeck|wagerPayload/);
 await assert.rejects(play(db));
 assert.equal(values(db).casino_chips_v7,600);assert.equal(db.writes(),1);
 await play(db,{type:'slotsStart',wager:100});
 assert.equal(values(db).casino_chips_v7,500);
});

test('recovery metadata contains only the eligibility and stored refund amount',()=>{
 const snapshot=JSON.parse(publicCloudSnapshot(crossplayDb(seed()).row()).saveJson);
 assert.equal(snapshot.webCompanion.nativeCasinoRefund,100);
 assert.doesNotMatch(JSON.stringify(snapshot),/remainingDeck|wagerPayload/);
});

for(const [name,round,extra] of [
 ['recent wager',{acceptedAtMs:Date.now()},{}],
 ['committed outcome',{state:'OUTCOME_COMMITTED',payoutTreats:200,outcomePayload:'result'},{}],
 ['duplicate completion',{}, {casino_completed_round_ids_v1:JSON.stringify([id])}],
 ['malformed payload',{wagerPayload:'{}'},{}],
 ['wrong wager total',{wagerTreats:200},{}],
 ['invalid id',{roundId:'bad'},{}],
 ['unsafe refund',{wagerTreats:NaN},{}],
 ['overflow',{}, {casino_chips_v7:Number.MAX_SAFE_INTEGER}],
 ['current web round',{}, {beta_casino_round_v1:'existing'}],
])test('recovery rejects '+name+' without changing the wallet',async()=>{
 const db=crossplayDb(seed(round,extra));const before=db.row();
 await assert.rejects(play(db));assert.deepEqual(db.row(),before);assert.equal(db.writes(),0);
});

test('concurrent recovery uses the revision lock to refund exactly once',async()=>{
 const db=crossplayDb(seed());
 const results=await Promise.allSettled([play(db,undefined,1),play(db,undefined,1)]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(values(db).casino_chips_v7,600);assert.equal(db.writes(),1);
});

test('recovery retains PupEye ownership and compare-and-set protection',async()=>{
 for(const options of [{owner:false},{race:true}]){
  const db=crossplayDb(seed(),options);await assert.rejects(play(db));assert.equal(db.writes(),0);
 }
});


test('recovery preserves all reserved Chips from split and doubled hands',async()=>{
 const cards=Array.from({length:52},(_,i)=>i);
 const payload={schemaVersion:1,game:'BLACKJACK',dealerCards:cards.slice(0,2),remainingDeck:cards.slice(10),activeHandIndex:2,complete:false,
  hands:[{cards:cards.slice(2,5),wagerTreats:200000,stood:true,doubled:true,fromSplit:true,splitAces:false},
   {cards:cards.slice(5,8),wagerTreats:200000,stood:true,doubled:true,fromSplit:true,splitAces:false},
   {cards:cards.slice(8,10),wagerTreats:100000,stood:false,doubled:false,fromSplit:true,splitAces:false}]};
 const db=crossplayDb(seed({wagerTreats:500000,wagerPayload:JSON.stringify(payload)}));
 await play(db);assert.equal(values(db).casino_chips_v7,500500);
});


test('recovery rejects an unsupported cloud envelope before persisting',async()=>{
 const save=seed();save.version=2;const db=crossplayDb(save);
 await assert.rejects(play(db),{message:'PUP_CASINO_RECOVERY_UNAVAILABLE'});
 assert.equal(db.writes(),0);
});
