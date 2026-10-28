// One registered Puppy Clicker Discord OAuth redirect, shared with Android.
// The website's PKCE verifier stays in the browser; the app relays only the code.
export const PUPPY_DISCORD_CLIENT_ID="1547982688898777118";
export const PUPPY_DISCORD_REDIRECT_URI="discord-1547982688898777118:/authorize/callback";
const AUTH_URL="https://damcmyqusdxucwozkoeh.supabase.co/functions/v1/pup-web-auth";
const RELAY_URL="https://damcmyqusdxucwozkoeh.supabase.co/functions/v1/pup-web-discord-relay";
const PUBLISHABLE_KEY="sb_publishable_id7zKwH7BPmmohc7T3RZmA_DTjMaFVU";
const PENDING_KEY="puppy-web-discord-pkce-pending-v2";
const base64url=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes)))
 .replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");
const hex=bytes=>Array.from(new Uint8Array(bytes),v=>v.toString(16).padStart(2,"0")).join("");
const digest=text=>crypto.subtle.digest("SHA-256",new TextEncoder().encode(text));
async function post(url,body){
 const response=await fetch(url,{method:"POST",headers:{
  "Content-Type":"application/json","apikey":PUBLISHABLE_KEY
 },cache:"no-store",body:JSON.stringify(body)});
 let result={};try{result=await response.json()}catch{}
 if(!response.ok||result.error)throw new Error(result.error||"PUP_WEB_AUTH_UNAVAILABLE");
 return result;
}
export const requestPuppyAuth=(action,payload={})=>post(AUTH_URL,{action,...payload});
export const requestPuppyRelay=(action,payload={})=>post(RELAY_URL,{action,...payload});
export function hasPuppyDiscordCallback(){
 // Legacy browser HTTPS callback is intentionally NOT a valid Discord redirect.
 return false;
}
export function getPendingDiscord(){
 let record=null;
 try{record=JSON.parse(localStorage.getItem(PENDING_KEY)||"null");}catch{}
 if(!record||!/^pcw1_[A-Za-z0-9_-]{32,64}$/.test(record.state||"")||
     !record.verifier||!record.secret)return null;
 return record;
}
export function clearPendingDiscord(){localStorage.removeItem(PENDING_KEY);}
export async function beginPuppyDiscord(){
 if(!globalThis.crypto?.subtle||!globalThis.crypto?.getRandomValues||!globalThis.localStorage)
  throw new Error("SECURE_BROWSER_REQUIRED");
 const state="pcw1_"+base64url(crypto.getRandomValues(new Uint8Array(32)));
 const verifier=base64url(crypto.getRandomValues(new Uint8Array(48)));
 const secret=base64url(crypto.getRandomValues(new Uint8Array(32)));
 const challenge=base64url(await digest(verifier));
 await requestPuppyRelay("relay-start",{state,poll_digest:hex(await digest(secret))});
 localStorage.setItem(PENDING_KEY,JSON.stringify({state,verifier,secret,at:Date.now()}));
 const url=new URL("https://discord.com/oauth2/authorize");
 for(const [key,value] of Object.entries({
  client_id:PUPPY_DISCORD_CLIENT_ID,response_type:"code",
  redirect_uri:PUPPY_DISCORD_REDIRECT_URI,scope:"identify",
  state,code_challenge:challenge,code_challenge_method:"S256"
 }))url.searchParams.set(key,value);
 return url.toString();
}
export async function checkPendingPuppyDiscord(client){
 const pending=getPendingDiscord();
 if(!pending)return {status:"none"};
 if(Date.now()-pending.at>5*60*1000){
  clearPendingDiscord();throw new Error("DISCORD_LOGIN_EXPIRED");
 }
 const result=await requestPuppyRelay("relay-poll",{
  state:pending.state,poll_secret:pending.secret
 });
 if(!result.ready)return {status:"waiting"};
 // Code is one-time: cannot be polled twice. Do not retry failed exchanges
 // or revert to unverified Supabase OAuth users.
 clearPendingDiscord();
 const data=await requestPuppyAuth("discord-exchange",{
  code:result.code,verifier:pending.verifier,
  redirectUri:PUPPY_DISCORD_REDIRECT_URI
 });
 if(!data.token_hash||data.otp_type!=="magiclink")
  throw new Error("PUP_WEB_SESSION_INVALID");
 const {error}=await client.auth.verifyOtp({token_hash:data.token_hash,type:"magiclink"});
 if(error)throw new Error("PUP_WEB_SESSION_INVALID");
 return {status:"complete"};
}
export async function verifyPuppySession(client){
 const {data,error}=await client.functions.invoke("pup-web-auth",{body:{action:"status"}});
 if(error||!data?.verified||!data?.account?.id)
  throw new Error(data?.error||"PUP_ACCOUNT_SESSION_REQUIRED");
 return data.account;
}
export async function signInPupUsername(client,login,password){
 const data=await requestPuppyAuth("password-login",{login,password});
 if(!data.access_token||!data.refresh_token)throw new Error("PUP_WEB_SESSION_INVALID");
 const {error}=await client.auth.setSession({
  access_token:data.access_token,refresh_token:data.refresh_token
 });
 if(error)throw new Error("PUP_WEB_SESSION_INVALID");
 return verifyPuppySession(client);
}
