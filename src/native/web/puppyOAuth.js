// Dedicated Puppy Clicker Discord OAuth; never use the shared Supabase Discord
// provider (which is configured for another Harley's Studios project).
export const PUPPY_DISCORD_CLIENT_ID="1547982688898777118";
export const PUPPY_DISCORD_REDIRECT_URI="https://puppy-clicker.vercel.app/auth/discord/callback";
const FUNCTION_URL="https://damcmyqusdxucwozkoeh.supabase.co/functions/v1/pup-web-auth";
const PUBLISHABLE_KEY="sb_publishable_id7zKwH7BPmmohc7T3RZmA_DTjMaFVU";
const PKCE_KEY="puppy-discord-web-pkce-v1";
const toUrlSafe=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes)))
 .replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");
export async function requestPuppyAuth(action,payload={}){
 const response=await fetch(FUNCTION_URL,{
  method:"POST",
  headers:{"Content-Type":"application/json","apikey":PUBLISHABLE_KEY},
  body:JSON.stringify({action,...payload}),cache:"no-store"
 });
 let data={};try{data=await response.json()}catch{}
 if(!response.ok||data.error)throw new Error(data.error||"PUP_WEB_AUTH_UNAVAILABLE");
 return data;
}
export async function beginPuppyDiscord(){
 if(!globalThis.crypto?.subtle||!globalThis.crypto?.getRandomValues||!globalThis.sessionStorage)
  throw new Error("SECURE_BROWSER_REQUIRED");
 const state=toUrlSafe(crypto.getRandomValues(new Uint8Array(24)));
 const verifier=toUrlSafe(crypto.getRandomValues(new Uint8Array(48)));
 const challenge=toUrlSafe(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(verifier)));
 sessionStorage.setItem(PKCE_KEY,JSON.stringify({state,verifier,at:Date.now()}));
 const url=new URL("https://discord.com/oauth2/authorize");
 const params={
  client_id:PUPPY_DISCORD_CLIENT_ID,response_type:"code",
  redirect_uri:PUPPY_DISCORD_REDIRECT_URI,
  scope:"identify",state,code_challenge:challenge,code_challenge_method:"S256"
 };
 for(const [name,value] of Object.entries(params))url.searchParams.set(name,value);
 // Only direct user action opens Discord. Never send sign-ins to ARC Raiders.
 window.location.assign(url.toString());
}
export function hasPuppyDiscordCallback(){
 return window.location.pathname==="/auth/discord/callback";
}
export async function finishPuppyDiscord(client){
 if(!hasPuppyDiscordCallback())return false;
 const params=new URLSearchParams(window.location.search);
 const error=params.get("error");
 // Remove OAuth data from browser history, successful or failed.
 const code=params.get("code"),state=params.get("state");
 window.history.replaceState({},"","/");
 if(error)throw new Error("DISCORD_AUTHORIZATION_DENIED");
 let pending;
 try{pending=JSON.parse(sessionStorage.getItem(PKCE_KEY)||"null");}
 catch{pending=null;}
 sessionStorage.removeItem(PKCE_KEY);
 if(!pending||Date.now()-pending.at>5*60*1000||
   typeof state!=="string"||state!==pending.state||!code)
  throw new Error("DISCORD_OAUTH_STATE_MISMATCH");
 const data=await requestPuppyAuth("discord-exchange",{
  code,verifier:pending.verifier,redirectUri:PUPPY_DISCORD_REDIRECT_URI
 });
 if(!data.token_hash||data.otp_type!=="magiclink")
  throw new Error("PUP_WEB_SESSION_INVALID");
 const {error:verificationError}=await client.auth.verifyOtp({
  token_hash:data.token_hash,type:"magiclink"
 });
 if(verificationError)throw new Error("PUP_WEB_SESSION_INVALID");
 return true;
}
export async function verifyPuppySession(client){
 const {data,error}=await client.functions.invoke("pup-web-auth",{
  body:{action:"status"}
 });
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
