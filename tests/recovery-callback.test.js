import test from 'node:test';
import assert from 'node:assert/strict';
import {completeRecoveryCallback} from '../src/native/web/recoveryCallback.js';
test('email PKCE exchange is single-use across remounts and precedes reading the session',async()=>{
 const previous={location:globalThis.location,history:globalThis.history};
 try{
  globalThis.location={pathname:'/recovery',search:'?code=email-code-123456',hash:''};
  let exchanges=0;const paths=[];
  globalThis.history={replaceState:(_s,_t,path)=>{paths.push(path);location.search=''}};
  const client={auth:{exchangeCodeForSession:async()=>{exchanges++;await new Promise(r=>setTimeout(r,5));return {error:null}}}};
  const a=completeRecoveryCallback(client),b=completeRecoveryCallback(client);
  assert.deepEqual(await Promise.all([a,b]),[{status:'complete'},{status:'complete'}]);
  assert.equal(exchanges,1);assert.deepEqual(paths,['/recovery']);
 }finally{Object.assign(globalThis,previous)}
});
test('failed email verification is actionable and scrubs provider errors',async()=>{
 const previous={location:globalThis.location,history:globalThis.history};
 try{
  globalThis.location={pathname:'/recovery',search:'',hash:'#error=access_denied&error_description=expired'};
  let cleaned=false;globalThis.history={replaceState:()=>{cleaned=true}};
  await assert.rejects(completeRecoveryCallback({}),/EMAIL_LINK_INVALID/);
  assert.equal(cleaned,true);
 }finally{Object.assign(globalThis,previous)}
});
