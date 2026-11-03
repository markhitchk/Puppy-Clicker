import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webServerRewardsDate,webServerEpochDay,localEpochDay,monthKey,goalsForDay,fallbackSchedule} from '../src/native/src/engine/monthlyRewards.js';
import {WEB_PREFERENCE_DEFAULTS,loadWebPreferences,saveWebPreferences,updateWebPreference} from '../src/native/web/preferences.js';

test('web daily rewards use the authoritative UTC date even before local midnight',()=>{
 const now=new Date('2026-11-02T22:37:00-08:00');
 const date=webServerRewardsDate(now);
 assert.equal(monthKey(date),'2026-11');
 assert.equal(date.getDate(),3);
 assert.equal(webServerEpochDay(now),localEpochDay(date));
 assert.equal(goalsForDay(fallbackSchedule(date),date).find(x=>x.id==='wellness')?.target,85);
});
test('UTC rollover is stable across DST and month boundaries',()=>{
 for(const iso of ['2026-11-01T08:10:00Z','2026-11-03T06:10:00Z','2027-01-01T00:05:00Z']){
  const now=new Date(iso);
  assert.equal(webServerEpochDay(now),localEpochDay(webServerRewardsDate(now)));
 }
});
test('guest and signed-in browser preferences share safe local storage, not cloud balances',()=>{
 const fake={raw:null,getItem(){return this.raw;},setItem(k,v){this.raw=v;}};
 assert.equal(loadWebPreferences(fake).themeMode,WEB_PREFERENCE_DEFAULTS.themeMode);
 const changed=updateWebPreference(loadWebPreferences(fake),'performancePreset','battery_saver');
 assert.equal(changed.performancePreset,'battery_saver');
 assert.equal(saveWebPreferences(changed,fake),true);
 assert.equal(loadWebPreferences(fake).performancePreset,'battery_saver');
 assert.equal(JSON.stringify(loadWebPreferences(fake)).includes('treats'),false);
});
test('guest browser settings route and shared navigation remain accessible without Pup Account',()=>{
 const app=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
 assert.match(app,/page==="browser-settings"\?<BrowserSettings\/>/);
 assert.match(app,/href="\/settings"/);
 const guest=readFileSync(new URL('../src/HomePlayDemo.jsx',import.meta.url),'utf8');
 assert.match(guest,/href="\/settings"/);
});

test('each individual web reward card uses the same UTC day as the parent rewards list',()=>{
 const component=readFileSync(new URL('../src/native/App.jsx',import.meta.url),'utf8');
 const card=component.slice(component.indexOf('function DailyGoalCard'),component.indexOf('function PlayScreen'));
 assert.match(card,/date=webServerRewardsDate\(clock\),today=webServerEpochDay\(clock\)/);
 assert.match(component,/readOnly=\{Platform\.OS==='web'\?account\?\.gameplayWritable!==true/);
});
