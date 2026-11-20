// Browser-only language persistence. Keep shared communityI18n.js platform-neutral
// so the Android app's language behavior is never changed by website consent.
import {
 LANGUAGE_CHANGED,normalizeLanguage,
 readLanguage as readSharedLanguage,writeLanguage as writeSharedLanguage
} from "../communityI18n.js";
import {canPersistCustomization} from "./cookiePreferences.js";
let temporaryLanguage=null;
export function readWebLanguage(storage,deviceLanguage){
 if(storage!==undefined||canPersistCustomization())return readSharedLanguage(storage,deviceLanguage);
 return temporaryLanguage||normalizeLanguage(deviceLanguage??globalThis.navigator?.language);
}
export function writeWebLanguage(value,storage){
 if(storage!==undefined||canPersistCustomization()){
  temporaryLanguage=null;
  return writeSharedLanguage(value,storage);
 }
 const language=normalizeLanguage(value);
 temporaryLanguage=language;
 if(typeof window!=="undefined"){
  document.documentElement.lang=language;
  window.dispatchEvent(new CustomEvent(LANGUAGE_CHANGED,{detail:{language}}));
 }
 return language;
}
export function resetVolatileWebLanguage(){temporaryLanguage=null;}
