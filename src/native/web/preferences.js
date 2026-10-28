import {DEFAULT_PREFERENCES,preferenceValue} from '../src/engine/settings.js';

export const WEB_PREFERENCES_KEY='puppy-clicker:web-preferences:v1';
const fields=['themeMode','accentHex','uiScale','performancePreset','animatedUi','buttonAnimations','reducedMotion','highContrast','animationsEnabled','compactNumbers','puppyPointerEnabled','dailyRewardNotifications','gameEventNotifications'];
export const WEB_PREFERENCE_DEFAULTS=Object.freeze({...Object.fromEntries(fields.map(key=>[key,DEFAULT_PREFERENCES[key]])),themeMode:'dark',accentHex:'#00E5FF'});
function sanitize(input){return Object.fromEntries(fields.map(key=>[key,preferenceValue(key,input?.[key])??WEB_PREFERENCE_DEFAULTS[key]]));}
export function loadWebPreferences(storage){
 try{const raw=(storage??globalThis.localStorage).getItem(WEB_PREFERENCES_KEY);return sanitize(raw?JSON.parse(raw):null);}catch{return {...WEB_PREFERENCE_DEFAULTS};}
}
export function saveWebPreferences(preferences,storage){
 try{(storage??globalThis.localStorage).setItem(WEB_PREFERENCES_KEY,JSON.stringify(sanitize(preferences)));return true;}catch{return false;}
}
export function updateWebPreference(current,name,value){
 if(!fields.includes(name)||preferenceValue(name,value)===undefined)return current;
 return {...sanitize(current),[name]:preferenceValue(name,value)};
}
export const withWebPreferences=(game,preferences)=>({...game,...sanitize(preferences)});
