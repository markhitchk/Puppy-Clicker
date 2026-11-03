import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {nextPlayReward} from '../src/native/src/engine/playRevamp.js';
import {fallbackSchedule,goalsForDay,localEpochDay,webServerEpochDay,webServerRewardsDate,progressForGoal} from '../src/native/src/engine/monthlyRewards.js';

const atUtcRollover='2026-11-03T07:46:00Z'; // Nov 2, 11:46 PM Los Angeles; Nov 3 UTC.
function withPacificClock(fn){
 const old=process.env.TZ;
 try{
  process.env.TZ='America/Los_Angeles';
  return fn(new Date(atUtcRollo));
 }finally{
  if(old===undefined)delete process.env.TZ;
  else process.env.TZ=old;
 }
}
const game=(now,progress=49,claimedDailyTasks=[])=>({
 dailyDay:webServerEpochDay(now),totalTaps:progress,dailyTapStart:0,
 careActions:0,dailyCareStart:0,totalShopPurchases:0,dailyShopStart:0,
 claimedDailyTasks
});

test('Play next reward follows the exact server UTC day and daily goals at Pacific 11:46 PM',()=>{
 withPacificClock(now=>{
  const serverDay=webServerRewardsDate(now);
  assert.notEqual(localEpochDay(now),webServerEpochDay(now),'the test must cross Pacific/UTC date boundary');
  const schedule=fallbackSchedule(serverDay),g=game(now);
  const expected=goalsForDay(schedule,serverDay)[0];
  const play=nextPlayReward(g,schedule,now,{serverDay:true});
  assert.equal(expected.id,'tap_time');
  assert.equal(play.title,'Next Reward · Tap Time');
  assert.equal(play.progress,progressForGoal(g,expected,serverDay));
  assert.deepEqual([play.progress,play.target,play.rewardTreats],[49,90,360]);
  // Old local-day behavior stays available to native Android (where local day is intentional).
  const native=nextPlayReward(g,schedule,now);
  assert.deepEqual([native.progress,native.target,native.rewardTreats],[0,75,300]);
 });
});

test('Play progress increases as cloud taps are confirmed, and the next unclaimed goal follows',()=>{
 withPacificClock(now=>{
  const schedule=fallbackSchedule(webServerRewardsDate(now));
  assert.equal(nextPlayReward(game(now,49),schedule,now,{serverDay:true}).progress,49);
  assert.equal(nextPlayReward(game(now,50),schedule,now,{serverDay:true}).progress,50);
  assert.equal(nextPlayReward(game(now,90),schedule,now,{serverDay:true}).progress,90);
  const afterClaim=nextPlayReward(game(now,90,['tap_time']),schedule,now,{serverDay:true});
  assert.equal(afterClaim.title,'Next Reward · Good Care');
  assert.deepEqual([afterClaim.progress,afterClaim.target,afterClaim.rewardTreats],[0,5,350]);
 });
});

test('Play screen passes browser server-day mode and pending tap count through both layouts',()=>{
 const app=readFileSync(new URL('../src/native/App.jsx',import.meta.url),'utf8');
 assert.match(app,/nextPlayReward\(g,schedule,clock,\{serverDay:Platform\.OS==='web'\}\)/);
 assert.match(app,/pendingTaps=\{queuedTaps\}/);
 assert.match(app,/Progress is pending cloud confirmation/);
});
