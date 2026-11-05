import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeTapRegularity} from '../src/webFairplaySignals.js';

test('regular automated-looking input is only summarized for advisory review',()=>{
 const taps=Array.from({length:101},(_,i)=>i*220);
 assert.deepEqual(summarizeTapRegularity(taps),{
  sampleCount:100,windowMs:22000,coefficientVariation:0
 });
});
test('human variation and insufficient windows are not reported',()=>{
 const varied=[0];
 for(let i=0;i<150;i++)varied.push(varied.at(-1)+(i%3===0?110:i%3===1?305:195));
 assert.equal(summarizeTapRegularity(varied),null);
 assert.equal(summarizeTapRegularity(Array.from({length:80},(_,i)=>i*200)),null);
 assert.equal(summarizeTapRegularity(Array.from({length:81},(_,i)=>i*120)),null);
});
test('invalid or duplicated browser timestamps fail safely',()=>{
 assert.equal(summarizeTapRegularity(Array.from({length:101},(_,i)=>i<60?i*200:59*200)),null);
 assert.equal(summarizeTapRegularity(Array.from({length:101},(_,i)=>i===99?NaN:i*200)),null);
});
