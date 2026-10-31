import test from "node:test";
import assert from "node:assert/strict";
import {readLanguage,writeLanguage,t,missingKeys,normalizeLanguage} from "../src/communityI18n.js";
test("English and Spanish dictionaries have matching keys",()=>{
 assert.deepEqual(missingKeys(),[]);
 assert.equal(t("es","rewards"),"Recompensas");
 assert.equal(t("pt","rewards"),"Rewards");
 assert.equal(normalizeLanguage("es-MX"),"es");
});
test("saved locale wins, then device language, then English",()=>{
 const data=new Map();
 const storage={getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)};
 assert.equal(readLanguage(storage,"es-MX"),"es");
 writeLanguage("en",storage);
 assert.equal(readLanguage(storage,"es-MX"),"en");
 data.clear();
 assert.equal(readLanguage(storage,"fr-FR"),"en");
});
