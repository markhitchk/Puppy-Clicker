import test from 'node:test';
import assert from 'node:assert/strict';

test('online roster requests independent manifests concurrently and retains failed folders',async()=>{
 const {loadRosterCatalog}=await import('../src/native/web/rosterLoader.js');
 let active=0,maxActive=0;
 const previous=[{folder:'v3',id:'v3_saved',assetId:'v3_saved',fileName:'saved.png',name:'Saved',free:false,redeemOnly:true,image:'https://raw.githubusercontent.com/markhitchk/pup-clinker/main/assets/v3/saved.png'}];
 const result=await loadRosterCatalog({previous,getText:async url=>{
  if(url.includes('api.github.com'))return JSON.stringify(['v2','v3','test'].map(name=>({type:'dir',name})));
  active++;maxActive=Math.max(maxActive,active);
  await new Promise(resolve=>setTimeout(resolve,5));active--;
  if(url.includes('/v3/'))throw Error('offline');
  return JSON.stringify({puppies:[{asset_id:url.includes('/test/')?'test_new':'v2_new',file:'new.png',name:'New'}]});
 }});
 assert.ok(maxActive>1,'independent manifest fetches must overlap');
 assert.ok(result.assets.some(p=>p.id==='v3_saved'),'failed folder must retain cached puppies');
 assert.equal(result.partial,true);
});

test('a failed refresh cannot replace previously cached remote puppies with an empty catalog',async()=>{
 const {loadRosterCatalog}=await import('../src/native/web/rosterLoader.js');
 await assert.rejects(loadRosterCatalog({previous:[],getText:async()=>{throw Error('offline');}}),/offline/);
});

test('cancelled refresh stops before starting additional manifest requests',async()=>{
 const {loadRosterCatalog}=await import('../src/native/web/rosterLoader.js');
 const controller=new AbortController();let requests=0;
 await assert.rejects(loadRosterCatalog({signal:controller.signal,getText:async()=>{
  requests++;controller.abort();return JSON.stringify([{type:'dir',name:'v2'}]);
 }}),{name:'AbortError'});
 assert.equal(requests,1);
});

test('duplicate IDs across cached and successful folders still fail closed',async()=>{
 const {loadRosterCatalog}=await import('../src/native/web/rosterLoader.js');
 await assert.rejects(loadRosterCatalog({getText:async url=>url.includes('api.github.com')?
  JSON.stringify(['v2','discord_rewards'].map(name=>({type:'dir',name}))):
  JSON.stringify({puppies:[{asset_id:'v2_duplicate',file:'puppy.png',name:'Duplicate'}]})
 }),/Invalid cached roster item/);
});
