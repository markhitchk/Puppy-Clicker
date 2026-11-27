import test from 'node:test';
import assert from 'node:assert/strict';
const hook=await import('../supabase/functions/_shared/auth-discord-webhook.ts');
const authReq=(body,headers={})=>new Request('https://example.com/auth',{method:'POST',
 headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)});
const capture=()=>{const calls=[];return {calls,fetchImpl:async(url,init)=>{calls.push({url,body:JSON.parse(init.body)});return new Response(null,{status:204});}};};
const secrets=/never-log|access-secret|refresh-secret|token_hash|hashed-secret/;
test('successful registration, login and failed login send clean Discord embeds',async()=>{
 const cases=[
  [{action:'register',username:'NewPup',password:'never-log'},201,{registered:true,access_token:'access-secret'},'registration','success'],
  [{action:'password-login',login:'NewPup',password:'never-log'},200,{access_token:'access-secret',refresh_token:'refresh-secret'},'login','success'],
  [{action:'password-login',login:'NewPup',password:'never-log'},401,{error:'PUP_SIGNIN_INVALID'},'login','failure']
 ];
 for(const [body,status,payload,event,outcome] of cases){
  const {calls,fetchImpl}=capture();
  const result=await hook.notifyAuthResponse(authReq(body,{'x-forwarded-for':'203.0.113.7, 10.0.0.1'}),
   new Response(JSON.stringify(payload),{status}),{},{},{fetchImpl,webhookUrl:'https://example.invalid/hook'});
  await result.task;
  assert.equal(calls.length,1);
  const sent=calls[0].body;
  assert.equal(sent.username,'Puppy Clicker Auth');
  assert.deepEqual(sent.allowed_mentions,{parse:[]});
  const fields=Object.fromEntries(sent.embeds[0].fields.map(f=>[f.name,f.value]));
  assert.equal(fields.Event,event);assert.equal(fields.Status,outcome);
  assert.equal(fields['IP address'],'203.0.113.7');
  assert.equal(fields.Username||fields['Attempted username'],'NewPup');
  assert.match(fields['Time (UTC)'],/^\d{4}-\d\d-\d\dT/);
  if(outcome==='failure')assert.equal(fields.Reason,'PUP_SIGNIN_INVALID');
  assert.doesNotMatch(JSON.stringify(sent),secrets);
 }
});
test('Discord OAuth login uses the verified account username and skips pending registrations',async()=>{
 const {calls,fetchImpl}=capture();
 const db={from(table){assert.equal(table,'pup_accounts');return {select(){return this;},eq(_c,v){assert.equal(v,'acct-1');return this;},maybeSingle:async()=>({data:{username:'DiscordPup'}})};}};
 const result=await hook.notifyAuthResponse(authReq({action:'discord-exchange',code:'oauth-code'}),
  new Response(JSON.stringify({token_hash:'hashed-secret',otp_type:'magiclink'})),db,{accountUuid:'acct-1'},{fetchImpl});
 await result.task;
 assert.equal(calls.length,1);
 const fields=Object.fromEntries(calls[0].body.embeds[0].fields.map(f=>[f.name,f.value]));
 assert.equal(fields.Username,'DiscordPup');assert.equal(fields.Method,'discord');
 assert.doesNotMatch(JSON.stringify(calls[0].body),secrets);
 const pending=await hook.notifyAuthResponse(authReq({action:'discord-exchange'}),
  new Response(JSON.stringify({registration_required:true})),db,{},{fetchImpl});
 assert.equal(pending,null);
});
test('non-auth actions and failed registrations are not sent or consumed',async()=>{
 const {calls,fetchImpl}=capture();
 let consumed=false;
 const response=new Response(new ReadableStream({pull(c){consumed=true;c.enqueue(new TextEncoder().encode('{}'));c.close();}},{highWaterMark:0}));
 assert.equal(await hook.notifyAuthResponse(authReq({action:'gameplay'}),response,{},{},{fetchImpl}),null);
 assert.equal(consumed,false);
 assert.equal(await hook.notifyAuthResponse(authReq({action:'register',username:'NewPup'}),
  new Response(JSON.stringify({error:'PUP_USERNAME_TAKEN'}),{status:409}),{},{},{fetchImpl}),null);
 assert.equal(calls.length,0);
});
test('webhook failures and stalls never throw or delay the auth response',async()=>{
 const errors=console.error;console.error=()=>{};
 try{
  await assert.doesNotReject(()=>hook.notifyAuthEvent({event:'login',status:'success',username:'NewPup',provider:'password',ip:null,timestamp:new Date().toISOString()},
   {fetchImpl:async()=>{throw new Error('offline');}}));
  await assert.doesNotReject(()=>hook.notifyAuthEvent({event:'login',status:'success',username:'NewPup',provider:'password',ip:null,timestamp:new Date().toISOString()},
   {fetchImpl:async()=>new Response('bad',{status:400})}));
  const start=Date.now();
  const response=new Response(JSON.stringify({access_token:'access-secret'}));
  const result=await hook.notifyAuthResponse(authReq({action:'password-login',login:'NewPup'}),response,{},{},
   {fetchImpl:(_u,init)=>new Promise((_r,reject)=>init.signal.addEventListener('abort',()=>reject(init.signal.reason))),timeoutMs:50});
  assert.ok(Date.now()-start<40,'auth path must not wait for Discord');
  assert.deepEqual(await response.json(),{access_token:'access-secret'});
  await result.task;
 }finally{console.error=errors;}
});
test('the webhook URL stays server-side',async()=>{
 const {readFileSync,readdirSync}=await import('node:fs');
 const id='1575733479474335864';
 const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(dir+'/'+e.name):[dir+'/'+e.name]);
 for(const file of walk(new URL('../src',import.meta.url).pathname))
  assert.ok(!readFileSync(file,'utf8').includes(id),file);
 assert.equal(hook.clientIp(new Request('https://x',{headers:{'x-forwarded-for':'not-an-ip','x-real-ip':'198.51.100.2'}})),'198.51.100.2');
});
