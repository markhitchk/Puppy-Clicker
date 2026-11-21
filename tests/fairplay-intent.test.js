import test from 'node:test';
import assert from 'node:assert/strict';
import {hasServerOwnedFields} from '../supabase/functions/_shared/fairplay-intent.js';
test('explicit client state, payout and identity injection are rejected',()=>{
 for(const key of ['save_data','saveJson','treats','player_xp_v1','total_taps','inventory','randomSeed','payout','account_uuid','role','risk_score']){
  assert.equal(hasServerOwnedFields({type:'tap',[key]:1}),true,key);
 }
 assert.equal(hasServerOwnedFields({type:'rouletteStart',bet:{type:'red',payout:500}}),true);
});
test('normal player intents remain compatible',()=>{
 for(const intent of [{type:'tap'},{type:'care',kind:'feed'},{type:'exchange',amount:5},{type:'rouletteStart',wager:2,bet:{type:'number',number:4}},{type:'claimAdvent',id:'1'}])
  assert.equal(hasServerOwnedFields(intent),false);
});
