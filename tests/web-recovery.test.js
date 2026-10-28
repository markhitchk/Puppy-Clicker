import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const source=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("recovery has its own SPA route and is linked from sign-in and account",()=>{
 const app=source("src/App.jsx");
 const gate=source("src/native/web/AccountGate.jsx");
 assert.match(app,/path==="\/recovery"\?"recovery"/);
 assert.match(app,/page==="recovery"\?<RecoveryPortal\/>/);
 assert.match(app,/<WebAccountGate><RecoveryPage\/><\/WebAccountGate>/);
 assert.match(app,/href="\/recovery"/);
 assert.match(gate,/href=\{recovery\?"\/account":"\/recovery"\}/);
 assert.match(gate,/recovery\?"\/recovery"/);
});

test("Discord PKCE callback preserves only approved recovery redirect",()=>{
 const oauth=source("src/native/web/puppyOAuth.js");
 assert.match(oauth,/previous==="\/account"\|\|previous==="\/recovery"/);
 assert.match(oauth,/globalThis\.history\.replaceState/);
 assert.match(oauth,/state!==pending\.state/);
 assert.match(oauth,/completePuppyDiscordCallback/);
});

test("recover password only with verified session and matching account login",()=>{
 const page=source("src/Recovery.jsx");
 const backend=source("supabase/functions/pup-web-auth/index.ts");
 assert.match(page,/useWebAccount\(\)/);
 assert.match(page,/action:"credential-check",username/);
 assert.match(page,/client\.auth\.updateUser\(\{password\}\)/);
 assert.match(page,/action:"credential-link",username/);
 assert.match(page,/password!==confirmation/);
 assert.match(backend,/const \{account,user\}=await currentSession\(req\)/);
 assert.doesNotMatch(page,/resetPasswordForEmail|sendResetLink|admin\.auth/);
 assert.doesNotMatch(page,/pup_account_saves|player_uuid|discord_user_id/);
});

test("recovery offers honest manual support fallback rather than unverified email reset",()=>{
 const page=source("src/Recovery.jsx");
 const gate=source("src/native/web/AccountGate.jsx");
 assert.match(page,/Lost Discord and password/);
 assert.match(page,/Contact emails are optional and unverified/);
 assert.match(gate,/independent proof of ownership/);
});
