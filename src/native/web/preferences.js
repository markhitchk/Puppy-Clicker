import {DEFAULT_PREFERENCES,preferenceValue} from '../src/engine/settings.js';
import {canPersistCustomization} from '../../privacy/cookiePreferences.js';

export const WEB_PREFERENCES_KEY='puppy-clicker:web-preferences:v1';
export const WEB_PREFERENCES_CHANGED='puppy-clicker:web-preferences-changed';
// Browser-only pointer settings never modify the user's game/cloud save.
// A webpage cannot read ChromeOS/Windows/macOS native cursor-size preferences,
// so Match system size uses a conventional 32 CSS-pixel pointer rendering.
// User-selected custom sizes are true raster PNGs (not CSS transforms).
export const SYSTEM_LIKE_POINTER_SIZE=32;
export const POINTER_SIZE_STEPS=Object.freeze([24,32,40,48,56,64,72,80,88,96]);
export const POINTER_SIZE_MODES=Object.freeze(['system','custom']);
export function isMobilePointerEnvironment(environment=globalThis){
 const navigatorInfo=environment?.navigator;
 const agent=navigatorInfo?.userAgent??'';
 return Boolean(navigatorInfo?.userAgentData?.mobile)
  || /Android|iPhone|iPad|iPod|Mobile/i.test(agent)
  || Boolean(environment?.matchMedia?.('(pointer: coarse)')?.matches);
}
// Use the original native Android Puppy pointer canvas (64×64, hotspot 16×16).
// Do not divide its bitmap size by devicePixelRatio. Native OS cursor sizes
// are not exposed to websites; users who need an exact system cursor can
// choose System pointer instead of the custom Puppy artwork.
export const ANDROID_NORMAL_POINTER_SIZE=64;
export function isAndroidPointerEnvironment(environment=globalThis){
 const nav=environment?.navigator;
 return /Android/i.test(nav?.userAgentData?.platform??'')||/Android/i.test(nav?.userAgent??'');
}
// Android exposes its real system pointer only through native CSS cursor keywords.
export function usesNativePointer(preferences,environment=globalThis){
 return preferences?.puppyPointerEnabled===false||(isAndroidPointerEnvironment(environment)&&preferences?.puppyPointerSizeMode!=='custom');
}
export function pointerSizeLimit(environment=globalThis){
 return isAndroidPointerEnvironment(environment)?64:96;
}
export function systemLikePointerSize(environment=globalThis){
 return isAndroidPointerEnvironment(environment)?ANDROID_NORMAL_POINTER_SIZE:SYSTEM_LIKE_POINTER_SIZE;
}
export function effectivePointerSize(preferences,environment=globalThis){
 const requested=preferences?.puppyPointerSizeMode==='custom'&&POINTER_SIZE_STEPS.includes(preferences?.puppyPointerCustomSize)
  ?preferences.puppyPointerCustomSize:systemLikePointerSize(environment);
 return Math.min(requested,pointerSizeLimit(environment));
}
export function effectivePointerSizeKey(preferences,environment=globalThis){
 return preferences?.puppyPointerSizeMode==='custom'?'custom-'+effectivePointerSize(preferences,environment):'system';
}

export const POINTER_THEMES=Object.freeze(['auto','dark','light']);
const cursorDefaults=Object.freeze({puppyPointerTheme:'auto',puppyPointerClickHighlight:true,puppyPointerSizeMode:'system',puppyPointerCustomSize:48,seasonalTheme:'default'});
const fields=['seasonalTheme','themeMode','accentHex','uiScale','performancePreset','animatedUi','buttonAnimations','reducedMotion','highContrast','animationsEnabled','compactNumbers','puppyPointerEnabled','puppyPointerTheme','puppyPointerClickHighlight','puppyPointerSizeMode','puppyPointerCustomSize','dailyRewardNotifications','gameEventNotifications'];
export const WEB_PREFERENCE_DEFAULTS=Object.freeze({...Object.fromEntries(fields.map(key=>[key,DEFAULT_PREFERENCES[key]??cursorDefaults[key]])),themeMode:'dark',accentHex:'#00E5FF'});
function validValue(name,value){
 if(name==='seasonalTheme')return ['default','winter'].includes(value)?value:undefined;
 if(name==='puppyPointerTheme')return POINTER_THEMES.includes(value)?value:undefined;
 if(name==='puppyPointerClickHighlight')return typeof value==='boolean'?value:undefined;
 if(name==='puppyPointerSizeMode')return POINTER_SIZE_MODES.includes(value)?value:undefined;
 if(name==='puppyPointerCustomSize')return POINTER_SIZE_STEPS.includes(value)?value:undefined;
 return preferenceValue(name,value);
}
export function pointerThemeFor(preferences,systemDark=false){
 if(preferences.puppyPointerTheme==='dark'||preferences.puppyPointerTheme==='light')return preferences.puppyPointerTheme;
 return preferences.themeMode==='dark'||(preferences.themeMode!=='light'&&systemDark)?'dark':'light';
}
function sanitize(input){
 // Existing v1 profiles stored the former false default even when the user
 // never touched the click-highlight switch. Upgrade those profiles once to
 // the new on-by-default behavior; later explicit off choices remain saved.
 const legacy=Boolean(input)&&!Object.hasOwn(input,'puppyPointerSizeMode');
 const normalized=legacy?{...input,puppyPointerClickHighlight:true}:input;
 return Object.fromEntries(fields.map(key=>[key,validValue(key,normalized?.[key])??WEB_PREFERENCE_DEFAULTS[key]]));
}
// When customization storage is declined, settings still work for this tab but
// are never written to persistent localStorage.
let volatilePreferences=null;
export function resetVolatileWebPreferences(){volatilePreferences=null;}
export function loadWebPreferences(storage){
 const target=storage??globalThis.localStorage;
 if(storage===undefined&&!canPersistCustomization(target))
  return volatilePreferences?{...volatilePreferences}:{...WEB_PREFERENCE_DEFAULTS};
 try{
  const raw=target.getItem(WEB_PREFERENCES_KEY);
  return sanitize(raw?JSON.parse(raw):null);
 }catch{return {...WEB_PREFERENCE_DEFAULTS};}
}
export function saveWebPreferences(preferences,storage){
 const cleaned=sanitize(preferences);
 let saved=true;
 if(storage===undefined&&!canPersistCustomization()){
  volatilePreferences=cleaned;
 }else{
  try{(storage??globalThis.localStorage).setItem(WEB_PREFERENCES_KEY,JSON.stringify(cleaned));volatilePreferences=null;}
  catch{saved=false;}
 }
 // Same-tab changes do not fire a browser storage event.
 if(typeof window!=='undefined'){
  window.dispatchEvent(new CustomEvent(WEB_PREFERENCES_CHANGED,{detail:{...cleaned}}));
 }
 return saved;
}
export function updateWebPreference(current,name,value){
 if(!fields.includes(name)||validValue(name,value)===undefined)return current;
 return {...sanitize(current),[name]:validValue(name,value)};
}
export const withWebPreferences=(game,preferences)=>({...game,...sanitize(preferences)});
