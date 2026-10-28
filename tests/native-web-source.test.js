import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("the website renders the original Android React Native PuppyApp, not the old UniversalApp",()=>{
 const app=read("src/App.jsx"),native=read("src/native/App.jsx");
 assert.match(app,/native\/App\.jsx/);
 assert.match(native,/export function PuppyApp/);
 for(const screen of ["PlayScreen","CareScreen","RosterScreen","ShopScreen","RewardsScreen","CasinoScreen","GachaScreen","PrestigeScreen"])
  assert.match(native,new RegExp(screen));
 assert.match(native,/desktop=width>=1000/);
 assert.match(native,/Player overview/);
});
test("real mobile game engine source has been copied with every major subsystem",()=>{
 const paths=["game.js","progression.js","blackjack.js","slotsV6.js","plinkoV6.js",
  "rouletteV6.js","wheelV6.js","shopV6.js","gacha.js","dynamicRoster.js","monthlyRewards.js"];
 for(const path of paths)assert.ok(existsSync(new URL("../src/native/src/engine/"+path,import.meta.url)),path);
 assert.match(read("src/native/src/state/useGame.js"),/puppy_web_save_commit/);
 assert.match(read("src/native/src/state/useGame.js"),/nativeGame/);
});
test("browser source never requires untrusted native device identity",()=>{
 const gate=read("src/native/web/AccountGate.jsx");
 assert.match(gate,/signInWithOAuth/);
 assert.doesNotMatch(gate,/PuppyBetaAccount|Keystore|guestSave/);
});
