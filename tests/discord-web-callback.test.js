import test from "node:test";
import assert from "node:assert/strict";
import {
 PUPPY_DISCORD_REDIRECT_URI,PUPPY_ANDROID_DISCORD_REDIRECT_URI,
 beginPuppyDiscord,completePuppyDiscordCallback,getPendingDiscord,
 hasPuppyDiscordCallback
} from "../src/native/web/puppyOAuth.js";

const ORIGIN="https://puppy-clicker.vercel.app";
function browser(path="/",search=""){
 const saved={location:globalThis.location,localStorage:globalThis.localStorage,
  history:globalThis.history,fetch:globalThis.fetch};
 const items=new Map();
 globalThis.location={origin:ORIGIN,pathname:path,search};
 globalThis.localStorage={
  getItem:key=>items.get(key)??null,
  setItem:(key,value)=>items.set(key,value),
  removeItem:key=>items.delete(key)
 };
 const paths=[];
 globalThis.history={state:null,replaceState:(_state,_title,url)=>paths.push(url)};
 return {items,paths,restore(){
  for(const [k,v] of Object.entries(saved)){
   if(v===undefined)delete globalThis[k];else globalThis[k]=v;
  }
 }};
}
test("web Discord redirect differs from the Android app callback",()=>{
 assert.equal(PUPPY_DISCORD_REDIRECT_URI,ORIGIN+"/auth/discord/callback");
 assert.equal(PUPPY_ANDROID_DISCORD_REDIRECT_URI,"discord-1547982688898777118:/authorize/callback");
});
test("Discord login starts with browser HTTPS redirect and PKCE",async()=>{
 const b=browser();
 try{
  const url=new URL(await beginPuppyDiscord());
  assert.equal(url.origin,"https://discord.com");
  assert.equal(url.searchParams.get("client_id"),"1547982688898777118");
  assert.equal(url.searchParams.get("redirect_uri"),PUPPY_DISCORD_REDIRECT_URI);
  assert.equal(url.searchParams.get("code_challenge_method"),"S256");
  assert.match(url.searchParams.get("code_challenge"),/^[A-Za-z0-9_-]{43}$/);
  assert.equal(getPendingDiscord().state,url.searchParams.get("state"));
  assert.ok(getPendingDiscord().verifier);
 }finally{b.restore();}
});
test("HTTPS callback exchanges Discord code, clears it from URL, and signs into Pup Account",async()=>{
 const b=browser("/auth/discord/callback");
 try{
  const authUrl=new URL(await beginPuppyDiscord());
  const state=authUrl.searchParams.get("state");
  globalThis.location.search="?code=discord-code-123456789&state="+state;
  const calls=[];
  globalThis.fetch=async (_url,options)=>{
   const body=JSON.parse(options.body);calls.push(body);
   return {ok:true,json:async()=>({token_hash:"test-hash",otp_type:"magiclink"})};
  };
  const client={auth:{verifyOtp:async token=>{
   assert.deepEqual(token,{token_hash:"test-hash",type:"magiclink"});
   return {error:null};
  }},functions:{invoke:async()=>({data:{verified:true,account:{id:'pup'}}})}};
  assert.equal(hasPuppyDiscordCallback(),true);
  assert.deepEqual(await completePuppyDiscordCallback(client),{status:"complete"});
  assert.equal(calls.length,1);
  assert.equal(calls[0].action,"discord-exchange");
  assert.equal(calls[0].redirectUri,PUPPY_DISCORD_REDIRECT_URI);
  assert.equal(calls[0].code,"discord-code-123456789");
  assert.equal(getPendingDiscord(),null);
  assert.deepEqual(b.paths,["/auth/discord/callback"]);
 }finally{b.restore();}
});
test("mismatched state blocks exchange and clears code from the address bar",async()=>{
 const b=browser("/auth/discord/callback","?code=discord-code-123456789&state=untrusted");
 try{
  await beginPuppyDiscord();
  globalThis.fetch=async()=>{throw Error("fetch must not run");};
  await assert.rejects(completePuppyDiscordCallback({}),/DISCORD_LOGIN_STATE_INVALID/);
  assert.deepEqual(b.paths,["/auth/discord/callback"]);
  assert.equal(getPendingDiscord(),null);
 }finally{b.restore();}
});

test('Strict Mode callback re-entry shares one exchange and verifies account before navigation',async()=>{
 const b=browser('/auth/discord/callback');
 try{
  const url=new URL(await beginPuppyDiscord());
  location.search='?code=discord-code-123456789&state='+url.searchParams.get('state');
  let calls=0,otps=0,checks=0;const destinations=[];
  location.replace=path=>{assert.equal(checks,1);destinations.push(path)};
  globalThis.fetch=async()=>{calls++;await new Promise(resolve=>setTimeout(resolve,5));return {ok:true,json:async()=>({token_hash:'hash',otp_type:'magiclink'})}};
  const client={auth:{verifyOtp:async()=>{otps++;return {error:null}}},
   functions:{invoke:async()=>{checks++;return {data:{verified:true,account:{id:'pup'}}}}}};
  const results=await Promise.allSettled([completePuppyDiscordCallback(client),completePuppyDiscordCallback(client)]);
  assert.deepEqual(results.map(x=>x.status),['fulfilled','fulfilled']);
  assert.equal(calls,1);assert.equal(otps,1);assert.equal(checks,1);
  assert.deepEqual(destinations,['/play']);
 }finally{b.restore()}
});

test('failed verification stays on a clean callback URL and never redirects to login',async()=>{
 const b=browser('/auth/discord/callback');
 try{
  const url=new URL(await beginPuppyDiscord());
  location.search='?code=discord-code-123456789&state='+url.searchParams.get('state');
  let redirects=0;location.replace=()=>redirects++;
  globalThis.fetch=async()=>({ok:false,json:async()=>({error:'PUP_ACCOUNT_LINK_REQUIRED'})});
  await assert.rejects(completePuppyDiscordCallback({}),/PUP_ACCOUNT_LINK_REQUIRED/);
  assert.deepEqual(b.paths,['/auth/discord/callback']);
  assert.equal(redirects,0);
 }finally{b.restore()}
});

test('expired callbacks never exchange codes',async()=>{
 const b=browser('/auth/discord/callback');
 try{
  const url=new URL(await beginPuppyDiscord());
  const key=[...b.items.keys()][0];const pending=JSON.parse(b.items.get(key));
  pending.at=Date.now()-300001;b.items.set(key,JSON.stringify(pending));
  location.search='?code=discord-code-123456&state='+url.searchParams.get('state');
  globalThis.fetch=()=>{throw Error('must not exchange')};
  await assert.rejects(completePuppyDiscordCallback({}),/DISCORD_LOGIN_EXPIRED/);
 }finally{b.restore()}
});
