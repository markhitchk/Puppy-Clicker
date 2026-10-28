// Website OAuth must return to an HTTPS route in this browser.
// Android retains its own app-only redirect; never use it for browser login.
export const PUPPY_DISCORD_CLIENT_ID="1547982688898777118";
export const PUPPY_DISCORD_REDIRECT_URI="https://puppy-clicker.vercel.app/auth/discord/callback";
export const PUPPY_ANDROID_DISCORD_REDIRECT_URI="discord-1547982688898777118:/authorize/callback";
const AUTH_URL="https://damcmyqusdxucwozkoeh.supabase.co/functions/v1/pup-web-auth";
const PUBLISHABLE_KEY="sb_publishable_id7zKwH7BPmmohc7T3RZmA_DTjMaFVU";
const PENDING_KEY="puppy-web-discord-pkce-pending-v3";
const ALLOWED_WEB_ORIGINS=new Set([
 "https://puppy-clicker.vercel.app",
 "http://localhost:5173",
 "http://127.0.0.1:4173"
]);
const base64url=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes)))
 .replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");
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

function callbackUri(){
 const origin=globalThis.location?.origin;
 if(!ALLOWED_WEB_ORIGINS.has(origin))throw new Error("PUP_WEB_ORIGIN_NOT_ALLOWED");
 return origin+"/auth/discord/callback";
}
export function hasPuppyDiscordCallback(){
 return globalThis.location?.pathname==="/auth/discord/callback";
}
export function getPendingDiscord(){
 let record=null;
 try{record=JSON.parse(localStorage.getItem(PENDING_KEY)||"null");}catch{}
 if(!record||!/^pcw1_[A-Za-z0-9_-]{32,64}$/.test(record.state||"")||
  !/^[A-Za-z0-9_-]{43,128}$/.test(record.verifier||"")||
  !Number.isFinite(record.at))return null;
 return record;
}
export function clearPendingDiscord(){globalThis.localStorage?.removeItem(PENDING_KEY);}

export async function beginPuppyDiscord(){
 if(!globalThis.crypto?.subtle||!globalThis.crypto?.getRandomValues||!globalThis.localStorage)
  throw new Error("SECURE_BROWSER_REQUIRED");
 const redirectUri=callbackUri();
 const state="pcw1_"+base64url(crypto.getRandomValues(new Uint8Array(32)));
 const verifier=base64url(crypto.getRandomValues(new Uint8Array(48)));
 const challenge=base64url(await digest(verifier));
 // Store verifier only in the original browser and never send it to Discord.
 localStorage.setItem(PENDING_KEY,JSON.stringify({state,verifier,at:Date.now()}));
 const url=new URL("https://discord.com/oauth2/authorize");
 for(const [key,value] of Object.entries({
  client_id:PUPPY_DISCORD_CLIENT_ID,response_type:"code",
  redirect_uri:redirectUri,scope:"identify",
  state,code_challenge:challenge,code_challenge_method:"S256"
 }))url.searchParams.set(key,value);
 return url.toString();
}

export async function completePuppyDiscordCallback(client){
 if(!hasPuppyDiscordCallback())return {status:"none"};
 const params=new URLSearchParams(globalThis.location.search);
 const pending=getPendingDiscord();
 const code=params.get("code"),state=params.get("state");
 const denied=params.has("error");
 // Remove the OAuth code from browser history before making any network call.
 // Only these fixed destinations are eligible after a browser OAuth callback.
 // Clear the authorization code from history before any network request.
 let next="/play";
 try{
  const previous=globalThis.sessionStorage?.getItem("puppy-web-discord-return-v1");
  if(previous==="/account"||previous==="/recovery")next=previous;
  globalThis.sessionStorage?.removeItem("puppy-web-discord-return-v1");
 }catch{}
 globalThis.history.replaceState(globalThis.history.state,"",next);
 clearPendingDiscord();
 if(denied)throw new Error("DISCORD_LOGIN_CANCELLED");
 if(!pending||!state||state!==pending.state)
  throw new Error("DISCORD_LOGIN_STATE_INVALID");
 if(Date.now()-pending.at>5*60*1000)
  throw new Error("DISCORD_LOGIN_EXPIRED");
 if(!/^[A-Za-z0-9_-]{8,2048}$/.test(code||""))
  throw new Error("DISCORD_CODE_INVALID");
 const data=await requestPuppyAuth("discord-exchange",{
  code,verifier:pending.verifier,redirectUri:callbackUri()
 });
 if(!data.token_hash||data.otp_type!=="magiclink")
  throw new Error("PUP_WEB_SESSION_INVALID");
 const {error}=await client.auth.verifyOtp({token_hash:data.token_hash,type:"magiclink"});
 if(error)throw new Error("PUP_WEB_SESSION_INVALID");
 // Refresh the selected protected page after Supabase installs the session.
 if(typeof globalThis.location?.replace==="function")globalThis.location.replace(next);
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
