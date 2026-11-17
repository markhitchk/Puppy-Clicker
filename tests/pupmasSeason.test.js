import test from 'node:test';
import assert from 'node:assert/strict';
import {PUPMAS_REWARDS,pupmasPhase,pupmasVisualsActive,pupmasDayStatus} from '../src/pupmas/pupmasSeason.js';

const at=(year,month,day)=>new Date(year,month-1,day,12);
test('calendar has 25 preview rewards',()=>{
  assert.equal(PUPMAS_REWARDS.length,25);
  assert.ok(PUPMAS_REWARDS.every(Boolean));
});
test('season opens and closes on expected dates',()=>{
  assert.equal(pupmasPhase(at(2026,11,30)),'upcoming');
  assert.equal(pupmasPhase(at(2026,12,1)),'calendar');
  assert.equal(pupmasPhase(at(2026,12,25)),'calendar');
  assert.equal(pupmasPhase(at(2026,12,26)),'catchup');
  assert.equal(pupmasPhase(at(2027,1,1)),'ended');
});
test('decorations are season-limited',()=>{
  assert.equal(pupmasVisualsActive(at(2026,11,26)),false);
  assert.equal(pupmasVisualsActive(at(2026,11,27)),true);
  assert.equal(pupmasVisualsActive(at(2027,1,5)),true);
  assert.equal(pupmasVisualsActive(at(2027,1,6)),false);
});
test('days are informational only and cannot grant currency',()=>{
  assert.equal(pupmasDayStatus(1,at(2026,11,30)),'locked');
  assert.equal(pupmasDayStatus(1,at(2026,12,1)),'today');
  assert.equal(pupmasDayStatus(1,at(2026,12,2)),'past');
  assert.equal(pupmasDayStatus(25,at(2026,12,2)),'locked');
  assert.equal(pupmasDayStatus(26,at(2026,12,26)),'invalid');
});
