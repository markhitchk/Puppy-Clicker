// Website OAuth must return to an HTTPS route in this browser.
import {puppyService} from '../../supabaseConfig.js';
// Android retains its own app-only redirect; never use it for browser login.
export const PUPPY_DISCORD_CLIENT_ID="1547982688898777118";
export const PUPPY_DISCORD_REDIRECT_URI="https://puppy-clicker.vercel.app/auth/discord/callback";
export const PUPPY_ANDROID_DISCORD_REDIRECT_URI="discord-1547982688898777118:/authorize/callback";
const AUTH_URL=puppyService.url+"/functions/v1/pup-web-auth";
const PUBLISHABLE_KEY=puppyService.key;
const PENDING_KEY="puppy-web-discord-pkce-pending-v3";
const SIGNUP_KEY="puppy-web-discord-signup-v1";
export function getPendingDiscordSignup(){
 try{
  const raw=globalThis.sessionStorage?.getItem(SIGNUP_KEY);
  if(!raw)return null;
  const obj=JSON.parse(raw);
  if(!obj?.ticket||!obj.profile?.id||!Number.isFinite(obj.at)||
   Date.now()-obj.at>9*60*1000){clearPendingDiscordSignup();return null;}
  return obj;
 }catch{return null;}
}
export function clearPendingDiscordSignup(){
 try{globalThis.sessionStorage?.removeItem(SIGNUP_KEY);}catch{}
}
let callbackAttempts=new WeakMap();
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
 callbackAttempts=new WeakMap();
 if(!globalThis.crypto?.subtle||!globalThis.crypto?.getRandomValues||!globalThis.localStorage)
  throw new Error("SECURE_BROWSER_REQUIRED");
 clearPendingDiscordSignup();
 const redirectUri=callbackUri();
 const state="pcw1_"+base64url(crypto.getRandomValues(new Uint8Array(32)));
 const verifier=base64url(crypto.getRandomValues(new Uint8Array(48)));
 const challenge=base64url(await digest(verifier));
 // Store verifier only in the original browser and never send it to Discord.
 localStorage.setItem(PENDING_KEY,JSON.stringify({state,verifier,at:Date.now()}));
 const url=new URL("https://discord.com/oauth2/authorize");
 for(const [key,value] of Object.entries({
  client_id:PUPPY_DISCORD_CLIENT_ID,response_type:"code",
  redirect_uri:redirectUri,scope:"identify email",
  state,code_challenge:challenge,code_challenge_method:"S256"
 }))url.searchParams.set(key,value);
 return url.toString();
}

export function completePuppyDiscordCallback(client){
 // React Strict Mode and auth events can revisit the same one-use callback.
 // Share the entire attempt, including failure, until an explicit new login.
 if(callbackAttempts.has(client))return callbackAttempts.get(client);
 if(!hasPuppyDiscordCallback())return Promise.resolve({status:"none"});
 const attempt=finishPuppyDiscordCallback(client);
 callbackAttempts.set(client,attempt);
 return attempt;
}
async function finishPuppyDiscordCallback(client){
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
  if(previous==="/account"||previous==="/recovery"||previous==="/account/admin")next=previous;
  globalThis.sessionStorage?.removeItem("puppy-web-discord-return-v1");
 }catch{}
 globalThis.history.replaceState(globalThis.history.state,"","/auth/discord/callback");
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
 if(data.registration_required===true&&data.ticket&&data.profile?.id){
  try{
   globalThis.sessionStorage?.setItem(SIGNUP_KEY,JSON.stringify({
    ticket:data.ticket,profile:data.profile,at:Date.now()
   }));
  }catch{throw new Error("SECURE_BROWSER_REQUIRED");}
  globalThis.location.replace("/account?mode=register&provider=discord");
  return {status:"registration_required"};
 }
 if(!data.token_hash||data.otp_type!=="magiclink")
  throw new Error("PUP_WEB_SESSION_INVALID");
 const {error}=await client.auth.verifyOtp({token_hash:data.token_hash,type:"magiclink"});
 if(error)throw new Error("PUP_WEB_SESSION_INVALID");
 await verifyPuppySession(client);
 // Refresh the selected protected page after Supabase installs the session.
 if(typeof globalThis.location?.replace==="function")globalThis.location.replace(next);
 return {status:"complete"};
}

export async function verifyPuppySession(client){
 const {data,error}=await client.functions.invoke("pup-web-auth",{body:{action:"status"}});
 if(error||!data?.verified||!data?.account?.id)
  throw new Error(data?.error||await puppyFunctionError(error,"PUP_ACCOUNT_SESSION_REQUIRED"));
 return data.account;
}

export async function puppyFunctionError(error,fallback="PUP_CLOUD_UNAVAILABLE"){
 try{
  const body=await (error?.context?.clone?.()||error?.context)?.json?.();
  if(/^[A-Z0-9_]{3,80}$/.test(body?.error||""))return body.error;
 }catch{}
 return fallback;
}
export function puppyAuthMessage(error){
 const code=error?.message||error;
 return ({
  DISCORD_LOGIN_CANCELLED:"Discord sign-in was cancelled. Choose Continue with Puppy Clicker Discord to try again.",
  DISCORD_LOGIN_STATE_INVALID:"This sign-in link does not match this browser. Start Discord sign-in again here; keep the same browser open.",
  DISCORD_LOGIN_EXPIRED:"Discord sign-in expired. Start sign-in again and complete it within five minutes.",
  PUP_ACCOUNT_LINK_REQUIRED:"This Discord identity belongs to a previous player record. Use account recovery to link the original Pup Account; a new account cannot claim its data.",
  PUP_DISCORD_ALREADY_LINKED:"This Discord account is already linked to a Pup Account. Sign in with Discord instead.",
  PUP_DISCORD_SIGNUP_EXPIRED:"Discord registration expired. Choose Create Account and reconnect Discord to start again.",
  PUP_DISCORD_EMAIL_UNAVAILABLE:"Discord did not supply a verified email address. Uncheck Import Discord email and continue.",
  PUP_DISCORD_PROFILE_SYNC_FAILED:"Discord profile sync is temporarily unavailable. Retry sign-in.",
  PUP_ACCOUNT_LEGAL_REQUIRED:"Open Puppy Clicker on Android and accept the current terms and privacy policy, then retry here.",
  PUP_OWNER_DEVICE_UNAVAILABLE:"Your Android PupEye owner installation is unavailable. Open the registered Android app or use account recovery.",
  PUP_ACCOUNT_BLOCKED:"Your Pup Account is restricted. Keep this session signed in and open your account to view the ban notice.",
  PUP_ACCOUNT_NOT_AVAILABLE:"Your Pup Account is unavailable. Contact Puppy Clicker support.",
  PUP_WEB_ORIGIN_NOT_ALLOWED:"Sign in at https://puppy-clicker.vercel.app. This website address is not approved for Discord sign-in.",
  PUP_USERNAME_TAKEN:"That Pup Account username is already registered.",
  PUP_SIGNUP_RATE_LIMIT:"Too many registrations right now. Try again later.",
  PUP_SIGNUP_UNAVAILABLE:"Pup Account registration is temporarily unavailable.",
  PUP_PASSWORD_COMPLEXITY_REQUIRED:"Password must contain an uppercase letter, a lowercase letter, a number and a special character (8–128 characters).",
  PUP_CONTACT_EMAIL_INVALID:"Enter a valid optional support contact email.",
  PUP_LEGAL_ACCEPTANCE_REQUIRED:"Accept both legal documents to register.",
  PUP_PASSWORD_INVALID:"Password must contain 8–128 characters.",
  PUP_USERNAME_INVALID:"Username must contain 3–20 letters, digits, underscores or hyphens.",
  PUP_SIGNIN_INVALID:"Incorrect Pup username or password.",
  PUP_WEB_SESSION_INVALID:"The sign-in session could not be saved. Allow website storage and start sign-in again in the same browser."
 })[code]||"Pup Account verification could not complete. Retry sign-in in this browser. If it keeps failing, use Account recovery or contact support.";
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
