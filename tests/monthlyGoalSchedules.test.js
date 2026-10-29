import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fallbackGoals,parseMonthlySchedule,goalsForDay} from '../src/native/src/engine/monthlyRewards.js';

for(const [month,year,monthIndex,count] of [['2026-10',2026,9,31],['2026-11',2026,10,30]]){
 test('web public '+month+' reward schedule matches the server-authoritative feed',()=>{
  const source=readFileSync(new URL('../assets/rewards/'+month+'.json',import.meta.url),'utf8');
  const served=readFileSync(new URL('../public/assets/rewards/'+month+'.json',import.meta.url),'utf8');
  assert.equal(served,source,'website public assets must be identical');
  const parsed=parseMonthlySchedule(source,new Date(year,monthIndex,1,12));
  assert.equal(Object.keys(parsed.days).length,count);
  for(let day=1;day<=count;day++){
   const actual=goalsForDay(parsed,new Date(year,monthIndex,day,12)).map(x=>[x.id,x.metric,x.target,x.rewardTreats]);
   const expected=fallbackGoals(day).map(x=>[x.id,x.metric,x.target,x.rewardTreats]);
   assert.deepEqual(actual,expected);
  }
 });
}
