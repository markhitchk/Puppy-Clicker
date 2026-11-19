import {ANDROID_BANNER_LAST_SEEN,ANDROID_BANNER_PERMANENTLY_DISMISSED} from "../androidBannerPolicy.js";
import {COOKIE_CHOICE_KEY,clearCookieChoice} from "./cookiePreferences.js";
import {WEB_PREFERENCES_KEY,WEB_PREFERENCES_CHANGED,resetVolatileWebPreferences} from "../native/web/preferences.js";
import {LANGUAGE_KEY,LANGUAGE_CHANGED,resetVolatileLanguage} from "../communityI18n.js";

export const CLEARABLE_WEBSITE_DATA=Object.freeze([
 "customization","notificationDisplay","appReminder","cookieDecision","login"
]);
const NOTIFICATION_PREFIX="puppy-clicker-notification-ui:v1:";
const oauthKeys=["puppy-web-discord-pkce-pending-v3","puppy-web-discord-signup-v1"];
const browserStorage=()=>{try{return globalThis.localStorage??null;}catch{return null;}};
const broadcast=eventName=>{
 if(typeof window!=="undefined")window.dispatchEvent(new CustomEvent(eventName));
};
function keysWithPrefix(storage,prefix){
 const found=[];
 if(!storage)return found;
 for(let i=0;i<storage.length;i++){
  const name=storage.key(i);
  if(typeof name==="string"&&name.startsWith(prefix))found.push(name);
 }
 return found;
}
// Narrow allowlist: NEVER clear the browser origin, Cache Storage, gameplay
// IndexedDB outbox, Supabase game saves or arbitrary third-party cookies.
export async function clearSelectedWebsiteData(selection,{
 storage=browserStorage(),auth=null,temporary=globalThis.sessionStorage
}={}){
 const categories=[...new Set(Array.isArray(selection)?selection:[])];
 if(categories.length===0||categories.some(x=>!CLEARABLE_WEBSITE_DATA.includes(x)))
  throw Error("SELECT_DATA_CATEGORY");
 if(!storage)throw Error("STORAGE_UNAVAILABLE");
 if(categories.includes("login")){
  if(!auth?.signOut)throw Error("SIGN_OUT_UNAVAILABLE");
  const {error}=await auth.signOut({scope:"local"});
  if(error)throw Error("SIGN_OUT_FAILED");
  // Supabase owns the auth key cleanup; do not blindly delete unrelated sb-*.
  for(const key of oauthKeys){
   try{storage.removeItem(key);}catch{}
   try{temporary?.removeItem(key);}catch{}
  }
 }
 if(categories.includes("customization")){
  storage.removeItem(WEB_PREFERENCES_KEY);
  storage.removeItem(LANGUAGE_KEY);
  resetVolatileWebPreferences();
  resetVolatileLanguage();
  broadcast(WEB_PREFERENCES_CHANGED);
  broadcast(LANGUAGE_CHANGED);
 }
 if(categories.includes("notificationDisplay")){
  for(const key of keysWithPrefix(storage,NOTIFICATION_PREFIX))storage.removeItem(key);
 }
 if(categories.includes("appReminder")){
  storage.removeItem(ANDROID_BANNER_LAST_SEEN);
  storage.removeItem(ANDROID_BANNER_PERMANENTLY_DISMISSED);
 }
 if(categories.includes("cookieDecision")){
  if(!clearCookieChoice(storage))throw Error("CLEAR_CONSENT_FAILED");
 }
 return categories;
}
export {COOKIE_CHOICE_KEY};
