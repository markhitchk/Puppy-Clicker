import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import roster from "../src/data/roster.js";
import {LEGACY_V6_PUPPIES} from "../src/native/src/engine/rosterV6.js";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("public roster uses published roster metadata rather than hardcoded placeholder puppies",()=>{
 const gallery=read("src/MeetPuppies.jsx");
 assert.match(gallery,/import roster from "\.\/data\/roster\.js"/);
 assert.match(gallery,/LEGACY_V6_PUPPIES/);
 assert.match(gallery,/p\.group!=="test"/);
 assert.match(gallery,/loading="lazy"/);
 assert.match(gallery,/Search puppies/);
 assert.ok(roster.some(p=>p.id==="classic")&&roster.some(p=>p.id==="v2_frost"));
 assert.ok(LEGACY_V6_PUPPIES.some(p=>p.id==="classic"&&p.description));
});

test("site routing exposes puppy roster and explicit 400 and 404 errors",()=>{
 const app=read("src/App.jsx");
 assert.match(app,/href="\/puppies"/);
 assert.match(app,/page==="puppies"\?/);
 assert.match(app,/<MeetPuppies preview\/>/);
 assert.match(app,/page==="error"\?<WebErrorPage/);
 assert.ok(app.includes('path==="/"?"home"'));
 assert.match(app,/errorRoute\?Number\(errorRoute\[1\]\):404/);
 const errors=read("src/WebErrorPage.jsx");
 for(const code of [400,401,403,404,408,409,429,500,502,503,504])
  assert.match(errors,new RegExp(" "+code+":\\{title:"));
 assert.doesNotMatch(errors,/\.stack|service_role|session\.access_token/);
});

test("sign-in and sign-up use standard browser password manager autofill semantics",()=>{
 const signIn=read("src/native/web/AccountGate.jsx");
 const register=read("src/WebRegister.jsx");
 assert.match(signIn,/autoComplete="on"/);
 assert.match(signIn,/name="username" autoComplete="username"/);
 assert.match(signIn,/name="password" autoComplete="current-password"/);
 assert.match(signIn,/type="submit"/);
 assert.match(register,/name="username" autoComplete="username"/);
 assert.match(register,/name="new-password" autoComplete="new-password"/);
 assert.match(register,/name="email" autoComplete="email"/);
});

test("loading phases use one branded component without fake progress",()=>{
 const gate=read("src/native/web/AccountGate.jsx");
 const native=read("src/native/App.jsx");
 const page=read("src/App.jsx");
 const loading=read("src/WebLoading.jsx");
 assert.match(gate,/<WebLoading stage=\{hasPuppyDiscordCallback/);
 assert.match(native,/<WebLoading stage="progress"\/>/);
 assert.match(native,/<WebLoading stage="startup" compact\/>/);
 assert.match(page,/<WebLoading stage="callback"\/>/);
 assert.doesNotMatch(loading,/progress=100|progress:\s*100|setInterval/);
 assert.match(loading,/role="status"/);
});

test("legacy register URL canonicalizes to /account and retains registration mode",()=>{
 const app=read("src/App.jsx"),gate=read("src/native/web/AccountGate.jsx");
 assert.match(app,/replaceState\?\./);
 assert.match(app,/\/account\?mode=register/);
 assert.match(gate,/get\("mode"\)==="register"/);
});
