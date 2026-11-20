import test from "node:test";
import assert from "node:assert/strict";
import {
 COOKIE_CHOICE_KEY,readCookieChoice,saveCookieChoice,clearCookieChoice,
 canPersistCustomization
} from "../src/privacy/cookiePreferences.js";
import {clearSelectedWebsiteData} from "../src/privacy/clearWebsiteData.js";
import {
 WEB_PREFERENCES_KEY,WEB_PREFERENCE_DEFAULTS,
 loadWebPreferences,saveWebPreferences,resetVolatileWebPreferences
} from "../src/native/web/preferences.js";
import {LANGUAGE_KEY} from "../src/communityI18n.js";

function createStorage(seed={}){
 const map=new Map(Object.entries(seed));
 return {
  map,getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,String(value)),
  removeItem:key=>map.delete(key),key:index=>[...map.keys()][index]??null,
  get length(){return map.size;}
 };
}
test("only necessary keeps encrypted session entries and removes optional customizations",()=>{
 const box=createStorage({
  [WEB_PREFERENCES_KEY]:'{"themeMode":"light"}',[LANGUAGE_KEY]:"es",
  "sb-foo-auth-token":"puppy-auth-aesgcm-v1:SECRET",
  "unrelated-not-ours":"keep"
 });
 const choice=saveCookieChoice(false,box);
 assert.equal(choice?.functional,false);
 assert.equal(choice?.essential,true);
 assert.equal(choice?.analytics,false);
 assert.equal(choice?.advertising,false);
 assert.equal(box.getItem(WEB_PREFERENCES_KEY),null);
 assert.equal(box.getItem(LANGUAGE_KEY),null);
 assert.equal(box.getItem("sb-foo-auth-token"),"puppy-auth-aesgcm-v1:SECRET");
 assert.equal(box.getItem("unrelated-not-ours"),"keep");
 assert.equal(canPersistCustomization(box),false);
 assert.deepEqual(readCookieChoice(box),choice);
});
test("legacy preferences are respected until an explicit choice, then optional saving is opt-in",()=>{
 const storage=createStorage({[WEB_PREFERENCES_KEY]:JSON.stringify(WEB_PREFERENCE_DEFAULTS)});
 assert.equal(canPersistCustomization(storage),true);
 assert.equal(readCookieChoice(storage),null);
 saveCookieChoice(false,storage);
 assert.equal(canPersistCustomization(storage),false);
 saveCookieChoice(true,storage);
 assert.equal(canPersistCustomization(storage),true);
});
test("new visitors without consent never persist new customizations",()=>{
 const prior=globalThis.localStorage;
 const storage=createStorage();
 globalThis.localStorage=storage;
 try{
  resetVolatileWebPreferences();
  assert.equal(canPersistCustomization(),false);
  assert.equal(saveWebPreferences({...WEB_PREFERENCE_DEFAULTS,themeMode:"light"}),true);
  assert.equal(storage.getItem(WEB_PREFERENCES_KEY),null);
  assert.equal(loadWebPreferences().themeMode,"light");
  resetVolatileWebPreferences();
  assert.equal(loadWebPreferences().themeMode,WEB_PREFERENCE_DEFAULTS.themeMode);
  saveCookieChoice(true);
  assert.equal(saveWebPreferences({...WEB_PREFERENCE_DEFAULTS,themeMode:"light"}),true);
  assert.ok(storage.getItem(WEB_PREFERENCES_KEY));
 }finally{resetVolatileWebPreferences();if(prior===undefined)delete globalThis.localStorage;else globalThis.localStorage=prior;}
});
test("malformed cookie records cannot enable unused trackers",()=>{
 const storage=createStorage({[COOKIE_CHOICE_KEY]:JSON.stringify({
  version:1,functional:true,analytics:true,advertising:true,savedAt:0
 })});
 const choice=readCookieChoice(storage);
 assert.equal(choice?.functional,true);
 assert.equal(choice?.analytics,false);
 assert.equal(choice?.advertising,false);
 storage.setItem(COOKIE_CHOICE_KEY,"not json");
 assert.equal(readCookieChoice(storage),null);
 assert.equal(clearCookieChoice(storage),true);
});
test("selective clear only touches known keys, never queued gameplay or unrelated storage",async()=>{
 const notification1="puppy-clicker-notification-ui:v1:abc";
 const storage=createStorage({
  [WEB_PREFERENCES_KEY]:"{}",[LANGUAGE_KEY]:"es",
  [notification1]:"{read:true}","sb-x-auth-token":"sealed",
  "puppy-clicker-gameplay-cache":"KEEP_PROGRESS",
  "puppy_android_install_last_seen_v1":"123",
  [COOKIE_CHOICE_KEY]:JSON.stringify({version:1,functional:true})
 });
 const cleared=await clearSelectedWebsiteData(["customization","notificationDisplay","appReminder","cookieDecision"],{storage});
 assert.equal(cleared.length,4);
 assert.equal(storage.getItem(WEB_PREFERENCES_KEY),null);
 assert.equal(storage.getItem(LANGUAGE_KEY),null);
 assert.equal(storage.getItem(notification1),null);
 assert.equal(storage.getItem("puppy_android_install_last_seen_v1"),null);
 assert.equal(storage.getItem(COOKIE_CHOICE_KEY),null);
 assert.equal(storage.getItem("sb-x-auth-token"),"sealed");
 assert.equal(storage.getItem("puppy-clicker-gameplay-cache"),"KEEP_PROGRESS");
 assert.equal(storage.map.size,2);
});
test("clearing login invokes Supabase local signout, never global revocation",async()=>{
 const storage=createStorage({"sb-foo-auth-token":"sealed","puppy-web-discord-pkce-pending-v3":"pending"});
 let scope=null;
 const auth={signOut:async options=>{scope=options.scope;storage.removeItem("sb-foo-auth-token");return {error:null};}};
 await clearSelectedWebsiteData(["login"],{auth,storage,temporary:createStorage()});
 assert.equal(scope,"local");
 assert.equal(storage.getItem("sb-foo-auth-token"),null);
 assert.equal(storage.getItem("puppy-web-discord-pkce-pending-v3"),null);
});
test("failed signout does not silently remove a valid auth session",async()=>{
 const storage=createStorage({"sb-foo-auth-token":"sealed",[WEB_PREFERENCES_KEY]:"original"});
 const auth={signOut:async()=>({error:new Error("offline")})};
 await assert.rejects(clearSelectedWebsiteData(["login","customization"],{auth,storage}),/SIGN_OUT_FAILED/);
 assert.equal(storage.getItem("sb-foo-auth-token"),"sealed");
 assert.equal(storage.getItem(WEB_PREFERENCES_KEY),"original");
 await assert.rejects(clearSelectedWebsiteData([], {storage}),/SELECT_DATA_CATEGORY/);
});
