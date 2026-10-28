import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {projectKotlinCloudSave} from "../src/native/src/production/kotlinCloudPreview.js";
const source=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("Kotlin Pup Account save projection recovers existing currencies, roster and XP",()=>{
 const kotlin={format:"puppy-clicker-cloud-save",version:1,
  stores:{puppy_clicker_save:{values:{
   puppy_style:"v2_frost",puppy_name:"Frosty",
   unlocked_puppies:["classic","golden","poodle","spotty","v2_frost"],
   favorite_puppies:["v2_frost"],
   treats:12450,lifetime_treats:20000,bones_v7:83,pup_coins_v7:250,
   casino_chips_v7:93,player_xp_v1:500,total_taps:250,
   upgrade_better_treats:5,energy:70,fullness:95,happiness:88,cleanliness_v5:60,bond_v5:44
  },types:{}}}};
 const g=projectKotlinCloudSave(JSON.stringify(kotlin),"CrossPlayPlayer");
 assert.equal(g.guestName,"CrossPlayPlayer");
 assert.equal(g.puppyStyle,"v2_frost");
 assert.equal(g.puppyName,"Frosty");
 assert.equal(g.treats,12450);
 assert.equal(g.bones,83);
 assert.equal(g.pupCoins,250);
 assert.equal(g.casinoChips,93);
 assert.equal(g.xp,500);
 assert.equal(g.upgrades.better_treats,5);
 assert.ok(g.unlockedPuppies.includes("v2_frost"));
 assert.ok(g.favoritePuppies.includes("v2_frost"));
});
test("web game never writes legacy-only save blobs",()=>{
 const sourceText=source("src/native/src/state/useGame.js");
 assert.doesNotMatch(sourceText,/\.from\(["']puppy_web_saves/);
 assert.doesNotMatch(sourceText,/\.rpc\(["']puppy_web_save_commit/);
 assert.match(sourceText,/projectKotlinCloudSave/);
 assert.match(sourceText,/expectedRevision:revision\.current/);
 assert.match(sourceText,/action:"cloud-save-read"/);
 assert.match(sourceText,/action:"gameplay"/);
});
test("cross-play server verifies identity, installation and current revision before write",()=>{
 const auth=source("supabase/functions/pup-web-auth/index.ts");
 const gateway=source("supabase/functions/pup-web-auth/crossPlay.ts");
 assert.match(auth,/currentSession\(req\)/);
 assert.match(auth,/accountAllowed/);
 assert.match(gateway,/pupeye_installations/);
 assert.match(gateway,/account_uuid.*account\.id/);
 assert.match(gateway,/expectedRevision/);
 assert.match(gateway,/CLOUD_SAVE_CONFLICT/);
 assert.match(gateway,/\.eq\("revision",body\.expectedRevision\)/);
 assert.match(gateway,/applyBetaEconomy/);
 assert.doesNotMatch(gateway,/\.insert\(\{[^]*?pup_account_saves/);
});
