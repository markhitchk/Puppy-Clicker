import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {crossPlay} from "../supabase/functions/pup-web-auth/crossPlay.ts";
import {newBetaKotlinSave} from "../supabase/functions/_shared/beta-economy.ts";
import {crossplayDb} from "./helpers/crossplay-db.js";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("registration is reachable from Home, navigation and account sign-in",()=>{
 const app=read("src/App.jsx"),gate=read("src/native/web/AccountGate.jsx");
 assert.match(app,/path==="\/register"\?"register"/);
 assert.match(app,/page==="register"\?<WebRegister\/>/);
 assert.match(app,/href="\/register"/);
 assert.match(gate,/href="\/register"/);
});

test("public registration enforces both legal consents and server owned save",()=>{
 const edge=read("supabase/functions/pup-web-auth/index.ts");
 const start=edge.indexOf("async function registerWebAccount");
 const end=edge.indexOf("Deno.serve(",start);
 assert.ok(start>0&&end>start);
 const signup=edge.slice(start,end);
 for(const check of ["termsAccepted!==true","privacyAccepted!==true",
   "consume_pup_web_signup_budget","register_pup_web_account",
   "newBetaKotlinSave","admin.auth.admin.createUser","deleteUser(created.user.id)"])
  assert.ok(signup.includes(check),check);
 assert.doesNotMatch(signup,/body\.(player_uuid|account_uuid|installation_uuid|save_data|revision)/);
 const form=read("src/WebRegister.jsx");
 assert.match(form,/autoComplete="new-password"/);
 assert.match(form,/Terms of Use/);
 assert.match(form,/Privacy Policy/);
});

test("web-created account starts with server seed and can persist first tap",async()=>{
 const db=crossplayDb(newBetaKotlinSave(),{webOnly:true});
 const before=await crossPlay(db.admin,db.account,{action:"cloud-save-read"});
 assert.equal(before.cloud.revision,1);
 const tapped=await crossPlay(db.admin,db.account,{
  action:"gameplay",expectedRevision:1,intent:{type:"tap"}
 });
 assert.equal(tapped.cloud.revision,2);
 assert.equal(db.row().save_data.stores.puppy_clicker_save.values.total_taps,1);
 const reload=await crossPlay(db.admin,db.account,{action:"cloud-save-read"});
 assert.equal(reload.cloud.revision,2);
 assert.equal(JSON.parse(reload.cloud.saveJson).stores.puppy_clicker_save.values.total_taps,1);
});

test("web-only exception does not bypass existing Android ownership enforcement",async()=>{
 const seed=newBetaKotlinSave();
 const android=crossplayDb(seed,{owner:false});
 await assert.rejects(crossPlay(android.admin,android.account,{action:"cloud-save-read"}),{
  message:"PUP_OWNER_DEVICE_UNAVAILABLE"
 });
 const forged=crossplayDb(seed,{webOnly:true});
 forged.account.origin_platform="android";
 await assert.rejects(crossPlay(forged.admin,forged.account,{action:"cloud-save-read"}),{
  message:"PUP_OWNER_DEVICE_UNAVAILABLE"
 });
});

test("registration never places service secret in browser",()=>{
 const form=read("src/WebRegister.jsx");
 const oauth=read("src/native/web/puppyOAuth.js");
 assert.doesNotMatch(form+oauth,/SUPABASE_SERVICE_ROLE_KEY|service_role/);
});
