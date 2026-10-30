import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {cost} from "../src/native/src/engine/game.js";
import {isPlayDemoRoute} from "../src/playDemoRoute.js";
import {
 createHomePlayDemo,reduceHomePlayDemo,HOME_DEMO_PUPPIES,
 HOME_DEMO_UPGRADE,HOME_DEMO_GOAL,
} from "../src/homePlayDemoState.js";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("homepage demo uses in-memory gameplay with the real tap and upgrade economy",()=>{
 const fresh=createHomePlayDemo();
 assert.equal(fresh.treats,20);
 assert.equal(fresh.bones,1);
 assert.equal(cost(fresh,HOME_DEMO_UPGRADE),35);
 assert.equal(HOME_DEMO_GOAL,25);
 let game=fresh;
 for(let n=0;n<8;n++)game=reduceHomePlayDemo(game,{type:"tap",now:1000+n*500});
 assert.equal(game.totalTaps,8);
 assert.equal(game.treats,36);
 game=reduceHomePlayDemo(game,{type:"upgrade"});
 assert.equal(game.treats,1);
 assert.equal(game.bones,0);
 assert.equal(game.clickPower,2);
 assert.equal(game.upgrades.better_treats,1);
 game=reduceHomePlayDemo(game,{type:"tap",now:9000});
 assert.equal(game.treats,4);
 assert.equal(fresh.totalTaps,0,"demo actions must not mutate prior state");
 assert.equal(createHomePlayDemo().totalTaps,0,"a new visitor starts with fresh demo state");
});

test("homepage demo changes puppies, restores energy, and resets without an account",()=>{
 let game=createHomePlayDemo();
 assert.deepEqual(HOME_DEMO_PUPPIES.map(p=>p.id),["classic","golden","poodle","spotty"]);
 game=reduceHomePlayDemo(game,{type:"switch",id:"golden",now:2000});
 assert.equal(game.puppyStyle,"golden");
 game=reduceHomePlayDemo(game,{type:"switch",id:"v2_dev_pup",now:2001});
 assert.equal(game.puppyStyle,"golden","sample roster must not unlock a dev puppy");
 game=reduceHomePlayDemo(game,{type:"rest"});
 assert.equal(game.energy,100);
 game=reduceHomePlayDemo(game,{type:"reset"});
 assert.equal(game.puppyStyle,"classic");
 assert.equal(game.energy,80);
 assert.equal(game.treats,20);
});

test("the demo exists only on /play?=demo and is not embedded in the homepage",()=>{
 const app=read("src/App.jsx"),demo=read("src/HomePlayDemo.jsx");
 const state=read("src/homePlayDemoState.js"),styles=read("src/HomePlayDemo.css");
 const home=app.slice(app.indexOf("function Home(){"),app.indexOf("const accountRole="));
 assert.match(app,/import HomePlayDemo from "\.\/HomePlayDemo\.jsx"/);
 assert.match(app,/function TryDemoLink\(\)/);
 assert.match(app,/access==="guest"\?<a className="cta cta-secondary" href="\/play\?=demo"/);
 assert.match(app,/function DemoPage\(\)/);
 assert.match(app,/page==="demo"\?<DemoPage\/>/);
 assert.match(app,/window.location.replace\("\/play"\)/);
 assert.doesNotMatch(home,/<HomePlayDemo/);
 assert.match(demo,/data-testid="home-play-demo"/);
 assert.match(demo,/href="\/play"/);
 assert.match(demo,/Reset demo/);
 assert.match(demo,/Demo only/);
 assert.match(demo,/HOME_DEMO_UPGRADE/);
 assert.match(styles,/night-yard-v1\.webp/);
 assert.match(styles,/@media\(max-width:650px\)/);
 for(const source of [demo,state]){
  const executable=source.split("\n").filter(line=>!line.trimStart().startsWith("//")).join("\n");
  assert.doesNotMatch(executable,/(?:localStorage|sessionStorage|supabase|functions\.invoke|fetch\()/i);
 }
});

test("only the explicit /play?=demo query opens the public demo",()=>{
 assert.equal(isPlayDemoRoute("/play","?=demo"),true);
 assert.equal(isPlayDemoRoute("/play","?=demo&source=home"),true);
 for(const [path,search] of [
  ["/play",""],["/play","?demo"],["/play","?demo=true"],
  ["/play","?=Demo"],["/play","?=demo&=demo"],
  ["/account","?=demo"],["/puppies","?=demo"],["/play/","?=demo"],
  ["/play","?=demo%20"]
 ])assert.equal(isPlayDemoRoute(path,search),false,path+" "+search);
});

test("explicit demo route bypasses only its own frontend screen, never the live game gate",()=>{
 const app=read("src/App.jsx");
 const demo=read("src/HomePlayDemo.jsx");
 assert.match(app,/demo\?"demo":path==="\/play"\?"play"/);
 assert.match(app,/page==="demo"\?<DemoPage\/>/);
 assert.match(app,/page==="error"\?<WebErrorPage[^\n]+:<NativeApp\/>/);
 assert.match(app,/href="\/play\?=demo"/);
 assert.match(demo,/standalone=false/);
 assert.match(demo,/href="\/play\?=demo"/);
 assert.doesNotMatch(read("src/playDemoRoute.js"),/(?:import .*AccountGate|verifyPuppySession|signInPupUsername|functions\.invoke)/i);
});
