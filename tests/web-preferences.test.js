import test from 'node:test';
import assert from 'node:assert/strict';

test('browser preferences survive reload without accepting cloud progression as settings',async()=>{
 const {loadWebPreferences,saveWebPreferences,updateWebPreference,withWebPreferences}=await import('../src/native/web/preferences.js');
 let saved=null;const storage={getItem:()=>saved,setItem:(_key,value)=>{saved=value;}};
 const defaults=loadWebPreferences(storage);
 assert.equal(defaults.themeMode,'dark');
 const prefs=updateWebPreference(defaults,'accentHex','#100020');
 assert.equal(saveWebPreferences({...prefs,treats:999999,puppyStyle:'v2_dev_pup'},storage),true);
 const loaded=loadWebPreferences(storage);
 assert.equal(loaded.accentHex,'#100020');assert.equal(loaded.treats,undefined);
 const game=withWebPreferences({treats:7,puppyStyle:'classic'},loaded);
 assert.equal(game.treats,7);assert.equal(game.puppyStyle,'classic');assert.equal(game.accentHex,'#100020');
});

test('invalid or blocked browser storage falls back safely',async()=>{
 const {loadWebPreferences,saveWebPreferences,updateWebPreference}=await import('../src/native/web/preferences.js');
 const blocked={getItem:()=>{throw Error('blocked');},setItem:()=>{throw Error('blocked');}};
 const defaults=loadWebPreferences(blocked);
 assert.equal(defaults.themeMode,'dark');assert.equal(saveWebPreferences(defaults,blocked),false);
 assert.deepEqual(updateWebPreference(defaults,'treats',1000),defaults);
 assert.deepEqual(updateWebPreference(defaults,'accentHex','bad color'),defaults);
 assert.deepEqual(loadWebPreferences({getItem:()=>'{broken'}),defaults);
});
