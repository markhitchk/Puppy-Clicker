import {test} from 'node:test';
import assert from 'node:assert/strict';
import {freshGame,ROSTER,UPGRADES,cost,purchase,tap,passive,care,handValue,sanitizeGame} from '../src/game.js';
test('all original V1 and V2 assets available',()=>{
  assert.equal(ROSTER.length,29);
  assert.equal(new Set(ROSTER.map(p=>p.id)).size,29);
  assert.match(ROSTER[0].image,/v1_classic\.png$/);
});
test('tapping produces Treats',()=>{
  const g=freshGame();tap(g,10000);assert.equal(g.treats,1);assert.equal(g.totalTaps,1);
});
test('shop deducts Treats and updates click power',()=>{
  const g=freshGame(),u=UPGRADES[0];g.treats=100;
  assert.equal(purchase(g,u),true);
  assert.equal(g.treats,100-cost(freshGame(),u));assert.equal(g.clickPower,2);
});
test('offline income is capped to four hours',()=>{
  const g=freshGame();g.autoPerSecond=2;passive(g,1000000);assert.equal(g.treats,28800);
});
test('care values are bounded',()=>{
  const g=freshGame();care(g,'feed');assert.equal(g.fullness,100);assert.equal(g.careActions,1);
});
test('blackjack handles aces',()=>{
  assert.equal(handValue([1,1,9]),21);assert.equal(handValue([10,12,2]),22);
});
test('malformed save cannot unlock arbitrary puppies',()=>{
  const g=sanitizeGame({treats:-1,clickPower:-4,unlockedPuppies:['v2_nonexistent']});
  assert.equal(g.treats,0);assert.equal(g.clickPower,1);assert.deepEqual(g.unlockedPuppies,['classic']);
});
