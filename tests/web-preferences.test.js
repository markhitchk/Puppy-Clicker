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


test('browser cursor mode and theme follow shared interface size',async()=>{
 const {loadWebPreferences,saveWebPreferences,updateWebPreference,POINTER_SIZES,pointerThemeFor}=await import('../src/native/web/preferences.js');
 let stored=null;
 const storage={getItem:()=>stored,setItem:(_key,value)=>{stored=value;}};
 const defaults=loadWebPreferences(storage);
 assert.equal(defaults.uiScale,'default');
 assert.deepEqual(POINTER_SIZES,{compact:32,default:64,large:96});
 assert.equal(defaults.puppyPointerEnabled,true);
 assert.equal(defaults.puppyPointerTheme,'auto');
 assert.equal(pointerThemeFor(defaults,false),'dark');
 assert.equal(pointerThemeFor({...defaults,themeMode:'system'},false),'light');
 assert.equal(pointerThemeFor({...defaults,themeMode:'system'},true),'dark');
 let prefs=updateWebPreference(defaults,'uiScale','compact');
 prefs=updateWebPreference(prefs,'puppyPointerEnabled',false);
 prefs=updateWebPreference(prefs,'puppyPointerTheme','light');
 prefs=updateWebPreference(prefs,'puppyPointerClickHighlight',true);
 assert.equal(saveWebPreferences(prefs,storage),true);
 const loaded=loadWebPreferences(storage);
 assert.equal(loaded.uiScale,'compact');
 assert.equal(loaded.puppyPointerEnabled,false);
 assert.equal(loaded.puppyPointerTheme,'light');
 assert.equal(loaded.puppyPointerClickHighlight,true);
 assert.equal(pointerThemeFor(loaded,true),'light');
 assert.equal(loaded.puppyPointerStyle,undefined);
 assert.equal(loaded.puppyPointerSize,undefined);
 assert.deepEqual(updateWebPreference(loaded,'puppyPointerStyle','paw'),loaded);
 assert.deepEqual(updateWebPreference(loaded,'puppyPointerSize','extra_large'),loaded);
 assert.deepEqual(updateWebPreference(loaded,'puppyPointerTheme','pink'),loaded);
 assert.deepEqual(updateWebPreference(loaded,'puppyPointerClickHighlight','true'),loaded);
 const legacy={getItem:()=>JSON.stringify({...loaded,puppyPointerStyle:'paw',puppyPointerSize:'extra_large'})};
 const migrated=loadWebPreferences(legacy);
 assert.equal(migrated.puppyPointerStyle,undefined);
 assert.equal(migrated.puppyPointerSize,undefined);
 assert.equal(JSON.parse(stored).cloudSave,undefined);
});
