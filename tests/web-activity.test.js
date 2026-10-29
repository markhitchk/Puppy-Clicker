import test from 'node:test';
import assert from 'node:assert/strict';
const activity=await import('../api/_lib/webActivity.js').catch(()=>({}));
const authAudit=await import('../supabase/functions/_shared/web-activity.ts').catch(()=>({}));
const sessionId='3798f44c-1598-4ac1-aa48-1abc814cdef1';
test('browser event ingestion rejects forged successful authentication events',()=>{
 assert.equal(typeof activity.normalizeBrowserEvent,'function');
 for(const event of ['login_success','register_success','WEB_BAN_CREATED'])
  assert.throws(()=>activity.normalizeBrowserEvent({event,sessionId}),{code:'INVALID_ACTIVITY_EVENT'});
});
test('browser event ingestion discards secrets, identities and query strings',()=>{
 assert.equal(typeof activity.normalizeBrowserEvent,'function');
 const value=activity.normalizeBrowserEvent({event:'client_error',sessionId,path:'/account?token=secret#password',errorCode:'PUP_WEB_AUTH_UNAVAILABLE',accountUuid:'spoofed',ip:'1.2.3.4',message:'password=secret',password:'secret'});
 assert.deepEqual(value,{sessionId,event:'client_error',path:'/account',errorCode:'PUP_WEB_AUTH_UNAVAILABLE',provider:null});
 assert.throws(()=>activity.normalizeBrowserEvent({event:'heartbeat',sessionId:'bad'}),{code:'INVALID_ACTIVITY_SESSION'});
 assert.equal(activity.normalizeBrowserEvent({event:'heartbeat',sessionId,path:'/private/token-secret',errorCode:'secret token'}).path,'/other');
 assert.equal(activity.normalizeBrowserEvent({event:'heartbeat',sessionId,errorCode:'secret token'}).errorCode,null);
});
test('auth audit classifies validated server responses without retaining payloads',()=>{
 assert.equal(typeof authAudit.classifyAuthActivity,'function');
 assert.deepEqual(authAudit.classifyAuthActivity('password-login',401,{error:'PUP_SIGNIN_INVALID',password:'secret'}),
  {event:'login_failed',outcome:'failure',provider:'password',errorCode:'PUP_SIGNIN_INVALID'});
 assert.equal(authAudit.classifyAuthActivity('register',201,{registered:true}).event,'register_success');
 assert.equal(authAudit.classifyAuthActivity('discord-exchange',200,{registration_required:true}).event,'discord_registration_required');
 assert.equal(authAudit.classifyAuthActivity('gameplay',200,{balance:100}),null);
 assert.equal(authAudit.classifyAuthActivity('status',503,{error:'raw sensitive exception'}).errorCode,'PUP_WEB_AUTH_UNAVAILABLE');
});
test('auth audit storage failures cannot change a successful authentication response',async()=>{
 assert.equal(typeof authAudit.auditAuthResponse,'function');
 const req=new Request('https://example.com/auth',{method:'POST',body:JSON.stringify({action:'register',username:'NewPup',password:'never-log'})});
 const response=new Response(JSON.stringify({registered:true}),{status:201});
 const db={from(){throw new Error('database offline');},rpc(){throw new Error('database offline');}};
 await assert.doesNotReject(()=>authAudit.auditAuthResponse(req,response,db));
 assert.deepEqual(await response.json(),{registered:true});
});
test('activity identity comes from a verified Pup link, never body claims or another app user',async()=>{
 const {activityIdentity}=await import('../api/_lib/webActivity.js');
 const db={auth:{getUser:async()=>({data:{user:{id:'verified-auth-user',user_metadata:{account_uuid:'forged'}}}})},
  from(table){assert.equal(table,'pup_web_auth_links');return {select(){return this;},eq(column,value){assert.equal(column,'auth_user_id');assert.equal(value,'verified-auth-user');return this;},maybeSingle:async()=>({data:null,error:null})};}};
 const result=await activityIdentity({headers:{authorization:'Bearer verified-token'},body:{accountUuid:'forged'}},db);
 assert.deepEqual(result,{accountUuid:null,authUserId:null});
});
test('registration audit cannot be attributed to a separate attacker-supplied login field',async()=>{
 let recorded;
 const req=new Request('https://example.com/auth',{method:'POST',body:JSON.stringify({action:'register',username:'NewPup',login:'ExistingVictim'})});
 const db={from(){return {select(){return this;},ilike(_field,name){this.name=name;return this;},maybeSingle(){return Promise.resolve({data:{id:this.name==='NewPup'?'new-account':'victim-account'}});}};},
  rpc(_name,params){recorded=params;return Promise.resolve({error:null});}};
 await authAudit.auditAuthResponse(req,new Response(JSON.stringify({registered:true}),{status:201}),db);
 assert.equal(recorded.p_account_uuid,'new-account');
 assert.equal(recorded.p_login_hint,'NewPup');
});
test('stalled audit storage has a hard deadline and cannot stall sign-in',async()=>{
 const req=new Request('https://example.com/auth',{method:'POST',body:JSON.stringify({action:'password-login',login:'NewPup'})});
 const db={rpc(){return new Promise(()=>{});}};
 const start=Date.now();
 await authAudit.auditAuthResponse(req,new Response('{}'),db,{accountUuid:'resolved-account'},20);
 assert.ok(Date.now()-start<200);
});
test('Discord activity uses the account verified by the auth handler',async()=>{
 let recorded;
 const req=new Request('https://example.com/auth',{method:'POST',body:JSON.stringify({action:'discord-exchange'})});
 await authAudit.auditAuthResponse(req,new Response('{}'),{rpc:async(_name,p)=>{recorded=p;return {}; }},
  {accountUuid:'verified-discord-account',authUserId:'verified-discord-auth'});
 assert.equal(recorded.p_account_uuid,'verified-discord-account');
 assert.equal(recorded.p_auth_user_id,'verified-discord-auth');
 assert.equal(recorded.p_event_code,'discord_authorized');
});
test('successful gameplay responses are not consumed or copied for optional authentication auditing',async()=>{
 let consumed=false;
 const response=new Response(new ReadableStream({pull(controller){
  consumed=true;controller.enqueue(new TextEncoder().encode('{"save":"large gameplay receipt"}'));controller.close();
 }},{highWaterMark:0}));
 const req=new Request('https://example.com/auth',{method:'POST',body:JSON.stringify({action:'gameplay'})});
 await authAudit.auditAuthResponse(req,response,{});
 assert.equal(consumed,false);
});
