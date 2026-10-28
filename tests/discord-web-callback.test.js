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
  }}};
  assert.equal(hasPuppyDiscordCallback(),true);
  assert.deepEqual(await completePuppyDiscordCallback(client),{status:"complete"});
  assert.equal(calls.length,1);
  assert.equal(calls[0].action,"discord-exchange");
  assert.equal(calls[0].redirectUri,PUPPY_DISCORD_REDIRECT_URI);
  assert.equal(calls[0].code,"discord-code-123456789");
  assert.equal(getPendingDiscord(),null);
  assert.deepEqual(b.paths,["/"]);
 }finally{b.restore();}
});
test("mismatched state blocks exchange and clears code from the address bar",async()=>{
 const b=browser("/auth/discord/callback","?code=discord-code-123456789&state=untrusted");
 try{
  await beginPuppyDiscord();
  globalThis.fetch=async()=>{throw Error("fetch must not run");};
  await assert.rejects(completePuppyDiscordCallback({}),/DISCORD_LOGIN_STATE_INVALID/);
  assert.deepEqual(b.paths,["/"]);
  assert.equal(getPendingDiscord(),null);
 }finally{b.restore();}
});
