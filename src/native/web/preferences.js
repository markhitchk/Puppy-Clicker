import {DEFAULT_PREFERENCES,preferenceValue} from '../src/engine/settings.js';

export const WEB_PREFERENCES_KEY='puppy-clicker:web-preferences:v1';
export const WEB_PREFERENCES_CHANGED='puppy-clicker:web-preferences-changed';
// Browser-only cursor choices do not affect cloud saves or Android preference schemas.
export const POINTER_SIZES=Object.freeze({small:32,medium:48,large:64,extra_large:96});
export const POINTER_STYLES=Object.freeze(['puppy','paw']);
export const POINTER_THEMES=Object.freeze(['auto','dark','light']);
const cursorDefaults=Object.freeze({
 puppyPointerSize:'large',puppyPointerStyle:'puppy',puppyPointerTheme:'auto',
 puppyPointerClickHighlight:false
});
const fields=['themeMode','accentHex','uiScale','performancePreset','animatedUi','buttonAnimations','reducedMotion','highContrast','animationsEnabled','compactNumbers','puppyPointerEnabled','puppyPointerSize','puppyPointerStyle','puppyPointerTheme','puppyPointerClickHighlight','dailyRewardNotifications','gameEventNotifications'];
export const WEB_PREFERENCE_DEFAULTS=Object.freeze({...Object.fromEntries(fields.map(key=>[key,DEFAULT_PREFERENCES[key]??cursorDefaults[key]])),themeMode:'dark',accentHex:'#00E5FF'});
function validValue(name,value){
 if(name==='puppyPointerSize')return Object.hasOwn(POINTER_SIZES,value)?value:undefined;
 if(name==='puppyPointerStyle')return POINTER_STYLES.includes(value)?value:undefined;
 if(name==='puppyPointerTheme')return POINTER_THEMES.includes(value)?value:undefined;
 if(name==='puppyPointerClickHighlight')return typeof value==='boolean'?value:undefined;
 return preferenceValue(name,value);
}
function sanitize(input){return Object.fromEntries(fields.map(key=>[key,validValue(key,input?.[key])??WEB_PREFERENCE_DEFAULTS[key]]));}
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
   detail:{...cleaned}
  }));
 }
 return saved;
}
export function updateWebPreference(current,name,value){
 if(!fields.includes(name)||validValue(name,value)===undefined)return current;
 return {...sanitize(current),[name]:validValue(name,value)};
}
export const withWebPreferences=(game,preferences)=>({...game,...sanitize(preferences)});
