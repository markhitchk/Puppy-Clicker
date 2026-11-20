// First-party website storage choices. No optional analytics or ad tracking
// scripts are shipped: disabled categories are never activated by a choice.
export const COOKIE_CHOICE_KEY="puppy-clicker:cookie-choice:v1";
export const COOKIE_CHOICE_CHANGED="puppy-clicker:cookie-choice-changed";
export const COOKIE_PREFERENCES_OPEN="puppy-clicker:cookie-preferences-open";
const CUSTOMIZATION_KEYS=[
 "puppy-clicker:web-preferences:v1",
 "puppy-clicker:language:v1"
];
const browserStorage=()=>{try{return globalThis.localStorage??null;}catch{return null;}};
const notify=()=>{
 if(typeof window!=="undefined"){
  window.dispatchEvent(new CustomEvent(COOKIE_CHOICE_CHANGED));
  window.dispatchEvent(new CustomEvent("puppy-clicker:web-preferences-changed"));
  window.dispatchEvent(new CustomEvent("puppy-clicker:language-changed"));
 }
};
export function readCookieChoice(storage=browserStorage()){
 try{
  const raw=storage?.getItem(COOKIE_CHOICE_KEY);
  if(!raw)return null;
  const value=JSON.parse(raw);
  if(value?.version!==1||typeof value.functional!=="boolean")return null;
  return {version:1,essential:true,functional:value.functional,analytics:false,advertising:false,
   savedAt:Number.isFinite(value.savedAt)?value.savedAt:0};
 }catch{return null;}
}
export function canPersistCustomization(storage=browserStorage()){
 const choice=readCookieChoice(storage);
 if(choice)return choice.functional;
 // Before first consent, preserve legacy users' explicitly saved preferences.
 // Never introduce *new* optional persistence until consent is given.
 try{return CUSTOMIZATION_KEYS.some(key=>storage?.getItem(key)!==null&&storage?.getItem(key)!==undefined);}
 catch{return false;}
}
export function saveCookieChoice(functional,storage=browserStorage()){
 const value={version:1,essential:true,functional:functional===true,analytics:false,
  advertising:false,savedAt:Date.now()};
 try{
  if(!storage)return null;
  storage.setItem(COOKIE_CHOICE_KEY,JSON.stringify(value));
  // Removing consent must remove optional persistent customization.
  if(!value.functional)for(const key of CUSTOMIZATION_KEYS)storage.removeItem(key);
  notify();
  return value;
 }catch{return null;}
}
export function clearCookieChoice(storage=browserStorage()){
 try{storage?.removeItem(COOKIE_CHOICE_KEY);notify();return true;}catch{return false;}
}
export function openCookiePreferences(){
 if(typeof window!=="undefined")window.dispatchEvent(new Event(COOKIE_PREFERENCES_OPEN));
}
