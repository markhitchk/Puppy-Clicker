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


test('browser cursor defaults to system-like size and enabled click feedback',async()=>{
 const {loadWebPreferences,saveWebPreferences,updateWebPreference,SYSTEM_LIKE_POINTER_SIZE,POINTER_SIZE_STEPS,pointerThemeFor,effectivePointerSize,effectivePointerSizeKey}=await import('../src/native/web/preferences.js');
 let stored=null;
 const storage={getItem:()=>stored,setItem:(_key,value)=>{stored=value;}};
 const defaults=loadWebPreferences(storage);
 assert.equal(defaults.puppyPointerEnabled,true);
 assert.equal(defaults.puppyPointerClickHighlight,true);
 assert.equal(defaults.puppyPointerSizeMode,'system');
 assert.equal(defaults.puppyPointerCustomSize,48);
 assert.equal(SYSTEM_LIKE_POINTER_SIZE,32);
 assert.deepEqual(POINTER_SIZE_STEPS,[24,32,40,48,56,64,72,80,88,96]);
 assert.equal(effectivePointerSize(defaults),32);
 assert.equal(effectivePointerSizeKey(defaults),'system');
 assert.equal(pointerThemeFor(defaults,false),'dark');
 assert.equal(pointerThemeFor({...defaults,themeMode:'system'},false),'light');
 assert.equal(pointerThemeFor({...defaults,themeMode:'system'},true),'dark');

 let prefs=updateWebPreference(defaults,'puppyPointerSizeMode','custom');
 prefs=updateWebPreference(prefs,'puppyPointerCustomSize',80);
 prefs=updateWebPreference(prefs,'puppyPointerTheme','light');
 prefs=updateWebPreference(prefs,'puppyPointerClickHighlight',false);
 assert.equal(effectivePointerSize(prefs),80);
 assert.equal(effectivePointerSizeKey(prefs),'custom-80');
 assert.equal(saveWebPreferences(prefs,storage),true);
 const loaded=loadWebPreferences(storage);
 assert.equal(loaded.puppyPointerCustomSize,80);
 assert.equal(loaded.puppyPointerSizeMode,'custom');
 assert.equal(loaded.puppyPointerClickHighlight,false);
 assert.equal(pointerThemeFor(loaded,true),'light');
 assert.deepEqual(updateWebPreference(loaded,'puppyPointerSizeMode','none'),loaded);
 assert.deepEqual(updateWebPreference(loaded,'puppyPointerCustomSize',33),loaded);
 assert.deepEqual(updateWebPreference(loaded,'puppyPointerCustomSize',-8),loaded);
 assert.deepEqual(updateWebPreference(loaded,'puppyPointerClickHighlight','true'),loaded);
 assert.deepEqual(updateWebPreference(loaded,'puppyPointerSize','extra_large'),loaded);

 const malformed={getItem:()=>JSON.stringify({...loaded,puppyPointerCustomSize:900,puppyPointerSizeMode:'unknown'})};
 const normalized=loadWebPreferences(malformed);
 assert.equal(normalized.puppyPointerSizeMode,'system');
 assert.equal(normalized.puppyPointerCustomSize,48);
 assert.equal(effectivePointerSize(normalized),32);
 assert.equal(JSON.parse(stored).cloudSave,undefined);
});

test('legacy profiles that saved the old off-by-default halo migrate once',async()=>{
 const {loadWebPreferences,updateWebPreference,saveWebPreferences}=await import('../src/native/web/preferences.js');
 let stored=JSON.stringify({themeMode:'light',puppyPointerEnabled:true,puppyPointerClickHighlight:false,uiScale:'large'});
 const storage={getItem:()=>stored,setItem:(_key,value)=>{stored=value;}};
 const migrated=loadWebPreferences(storage);
 assert.equal(migrated.themeMode,'light');
 assert.equal(migrated.uiScale,'large');
 assert.equal(migrated.puppyPointerClickHighlight,true);
 assert.equal(migrated.puppyPointerSizeMode,'system');
 const toggled=updateWebPreference(migrated,'puppyPointerClickHighlight',false);
 assert.equal(saveWebPreferences(toggled,storage),true);
 assert.equal(loadWebPreferences(storage).puppyPointerClickHighlight,false);
});

test('system-size mode ignores interface size and hybrid pointer environment',async()=>{
 const {isMobilePointerEnvironment,effectivePointerSize,effectivePointerSizeKey}=await import('../src/native/web/preferences.js');
 const compact={uiScale:'compact',puppyPointerSizeMode:'system',puppyPointerCustomSize:96};
 assert.equal(effectivePointerSize(compact),32);
 assert.equal(effectivePointerSize({...compact,uiScale:'large'}),32);
 assert.equal(effectivePointerSizeKey(compact),'system');
 assert.equal(effectivePointerSize({...compact,puppyPointerSizeMode:'custom'}),96);
 assert.equal(effectivePointerSizeKey({...compact,puppyPointerSizeMode:'custom'}),'custom-96');
 assert.equal(isMobilePointerEnvironment({navigator:{userAgent:'Mozilla/5.0 (Linux; Android 17; SM-A176U1) AppleWebKit'}}),true);
 assert.equal(isMobilePointerEnvironment({navigator:{userAgent:'Desktop'},matchMedia:()=>({matches:true})}),true);
 assert.equal(isMobilePointerEnvironment({navigator:{userAgent:'Desktop'},matchMedia:()=>({matches:false})}),false);
});

test('Android cursor compatibility limits high-density rendering without changing stored size',async()=>{
 const {pointerSizeLimit,effectivePointerSize,effectivePointerSizeKey}=await import('../src/native/web/preferences.js');
 const android=density=>({navigator:{userAgent:'Mozilla/5.0 (Linux; Android 17; SM-A176U1)'},devicePixelRatio:density});
 const custom={puppyPointerSizeMode:'custom',puppyPointerCustomSize:96};
 assert.equal(pointerSizeLimit(android(1)),64);
 assert.equal(pointerSizeLimit(android(2)),64);
 assert.equal(pointerSizeLimit(android(2.8125)),40);
 assert.equal(pointerSizeLimit(android(3)),40);
 assert.equal(pointerSizeLimit(android(4)),32);
 assert.equal(pointerSizeLimit(android(5)),24);
 assert.equal(effectivePointerSize(custom,android(2.8125)),40);
 assert.equal(effectivePointerSizeKey(custom,android(2.8125)),'custom-40');
 assert.equal(custom.puppyPointerCustomSize,96);
 assert.equal(effectivePointerSize(custom,{navigator:{userAgent:'CrOS'},devicePixelRatio:3}),96);
 assert.equal(pointerSizeLimit({navigator:{userAgentData:{platform:'Android'}},devicePixelRatio:3}),40);
 assert.equal(effectivePointerSize({puppyPointerSizeMode:'system'},android(2.8125)),32);
});
