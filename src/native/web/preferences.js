import {DEFAULT_PREFERENCES,preferenceValue} from '../src/engine/settings.js';

export const WEB_PREFERENCES_KEY='puppy-clicker:web-preferences:v1';
export const WEB_PREFERENCES_CHANGED='puppy-clicker:web-preferences-changed';
const fields=['themeMode','accentHex','uiScale','performancePreset','animatedUi','buttonAnimations','reducedMotion','highContrast','animationsEnabled','compactNumbers','puppyPointerEnabled','dailyRewardNotifications','gameEventNotifications'];
export const WEB_PREFERENCE_DEFAULTS=Object.freeze({...Object.fromEntries(fields.map(key=>[key,DEFAULT_PREFERENCES[key]])),themeMode:'dark',accentHex:'#00E5FF'});
function sanitize(input){return Object.fromEntries(fields.map(key=>[key,preferenceValue(key,input?.[key])??WEB_PREFERENCE_DEFAULTS[key]]));}
export function loadWebPreferences(storage){
 try{const raw=(storage??globalThis.localStorage).getItem(WEB_PREFERENCES_KEY);return sanitize(raw?JSON.parse(raw):null);}catch{return {...WEB_PREFERENCE_DEFAULTS};}
}
export function saveWebPreferences(preferences,storage){
 const cleaned=sanitize(preferences);
 let saved=true;
 try{(storage??globalThis.localStorage).setItem(WEB_PREFERENCES_KEY,JSON.stringify(cleaned));}
 catch{saved=false;}
 // Same-tab changes do not fire a browser storage event.
 // Notify the website cursor controller immediately, even if storage is blocked.
 if(typeof window!=='undefined'){
  window.dispatchEvent(new CustomEvent(WEB_PREFERENCES_CHANGED,{
   detail:{puppyPointerEnabled:cleaned.puppyPointerEnabled,themeMode:cleaned.themeMode}
  }));
 }
 return saved;
}
export function updateWebPreference(current,name,value){
 if(!fields.includes(name)||preferenceValue(name,value)===undefined)return current;
 return {...sanitize(current),[name]:preferenceValue(name,value)};
}
export const withWebPreferences=(game,preferences)=>({...game,...sanitize(preferences)});
