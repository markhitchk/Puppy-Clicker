import {DEFAULT_PREFERENCES,preferenceValue} from '../src/engine/settings.js';

export const WEB_PREFERENCES_KEY='puppy-clicker:web-preferences:v1';
export const WEB_PREFERENCES_CHANGED='puppy-clicker:web-preferences-changed';
// Keep browser-only pointer preferences separate from Pup Account/gameplay saves.
// Size is derived from the shared Interface size; old standalone size/style options
// are intentionally ignored when upgrading stored browser settings.
export const POINTER_SIZES=Object.freeze({compact:48,default:64,large:96});
/* Mobile devices use the normal 64px Puppy cursor even when their interface is
 * Compact (48px on desktop). The layout preference itself is not modified. */
export function isMobilePointerEnvironment(environment=globalThis){
 const navigatorInfo=environment?.navigator;
 const agent=navigatorInfo?.userAgent??'';
 return Boolean(navigatorInfo?.userAgentData?.mobile)
  || /Android|iPhone|iPad|iPod|Mobile/i.test(agent)
  || Boolean(environment?.matchMedia?.('(pointer: coarse)')?.matches);
}
export function effectivePointerSizeKey(preferences,mobile=false){
 const scale=Object.hasOwn(POINTER_SIZES,preferences?.uiScale)?preferences.uiScale:'default';
 return mobile&&scale==='compact'?'default':scale;
}
export function effectivePointerSize(preferences,mobile=false){
 return POINTER_SIZES[effectivePointerSizeKey(preferences,mobile)];
}

export const POINTER_THEMES=Object.freeze(['auto','dark','light']);
const cursorDefaults=Object.freeze({puppyPointerTheme:'auto',puppyPointerClickHighlight:false});
const fields=['themeMode','accentHex','uiScale','performancePreset','animatedUi','buttonAnimations','reducedMotion','highContrast','animationsEnabled','compactNumbers','puppyPointerEnabled','puppyPointerTheme','puppyPointerClickHighlight','dailyRewardNotifications','gameEventNotifications'];
export const WEB_PREFERENCE_DEFAULTS=Object.freeze({...Object.fromEntries(fields.map(key=>[key,DEFAULT_PREFERENCES[key]??cursorDefaults[key]])),themeMode:'dark',accentHex:'#00E5FF'});
function validValue(name,value){
 if(name==='puppyPointerTheme')return POINTER_THEMES.includes(value)?value:undefined;
 if(name==='puppyPointerClickHighlight')return typeof value==='boolean'?value:undefined;
 return preferenceValue(name,value);
}
export function pointerThemeFor(preferences,systemDark=false){
 if(preferences.puppyPointerTheme==='dark'||preferences.puppyPointerTheme==='light')return preferences.puppyPointerTheme;
 return preferences.themeMode==='dark'||(preferences.themeMode!=='light'&&systemDark)?'dark':'light';
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
