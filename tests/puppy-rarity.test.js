import test from 'node:test';
import assert from 'node:assert/strict';
import {eligibleIds, weightedChoice} from '../supabase/functions/_shared/puppy-rarity.ts';

const candidates=['one','two','three','draft','exclusive','event','unknown'];
const rows=['common','common','rare','common','unobtainable','legendary'].map((rarity,i)=>({
 puppy_id:candidates[i],rarity,published:i!==3,acquisition:i===5?'event':'standard'
}));
test('eligibility requires a published assigned standard puppy from the source pool',()=>{
 assert.deepEqual(eligibleIds(candidates,rows),['one','two','three']);
 assert.deepEqual(eligibleIds(candidates,[]),[]);
});
test('empty tiers are skipped and tier weight is independent of puppy count',()=>{
 const pool=eligibleIds(candidates,rows);
 for(let i=0;i<70;i++){
  const result=weightedChoice(pool,rows,limit=>limit===70?i:limit-1);
  assert.equal(result,i<60?'two':'three');
 }
 assert.equal(weightedChoice([],rows,()=>{throw Error('no draw expected')}),null);
});
