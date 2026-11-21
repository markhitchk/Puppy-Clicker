import test from 'node:test';
import assert from 'node:assert/strict';
import {validateFairplayProgression as validate} from '../supabase/functions/_shared/fairplay-progression.js';
const limits={maxTapReward:10000,maxXp:250000};
const save=values=>({stores:{puppy_clicker_save:{values}}});
const base={total_taps:10,legitimate_taps_v7:10,treats:20,lifetime_treats:30,player_xp_v1:10,care_actions_v5:5};
const tap={...base,total_taps:11,legitimate_taps_v7:11,treats:22,lifetime_treats:32,player_xp_v1:11};
test('valid server tap and achievement rewards pass',()=>{
 assert.deepEqual(validate(save(base),save(tap),'tap',limits),[]);
 assert.deepEqual(validate(save(base),save({...tap,player_xp_v1:61,achievement_rewarded_v1:['first_treat']}),'tap',limits),[]);
});
test('impossible tap count, Treat reward and XP are rejected before saving',()=>{
 const issues=validate(save(base),save({...tap,total_taps:90,treats:100000,lifetime_treats:100010,player_xp_v1:9999}),'tap',limits);
 for(const key of ['total_taps','treats','lifetime_treats','player_xp_v1'])assert.ok(issues.includes(key));
});
test('normal care, saturated historic XP and non-tap actions avoid false positives',()=>{
 assert.deepEqual(validate(save(base),save({...base,treats:0,care_actions_v5:6,player_xp_v1:15}),'care',limits),[]);
 assert.deepEqual(validate(save({...base,player_xp_v1:900000}),save({...tap,player_xp_v1:250000}),'tap',limits),[]);
 assert.deepEqual(validate({}, {}, 'prestige',limits),[]);
});
test('old tap counters and numeric saturation are supported',()=>{
 const legacy={...base};delete legacy.legitimate_taps_v7;
 assert.deepEqual(validate(save(legacy),save(tap),'tap',limits),[]);
 const max=Number.MAX_SAFE_INTEGER;
 assert.deepEqual(validate(save({...base,treats:max,total_taps:max,legitimate_taps_v7:max}),save({...tap,treats:max,total_taps:max,legitimate_taps_v7:max}),'tap',limits),[]);
});
