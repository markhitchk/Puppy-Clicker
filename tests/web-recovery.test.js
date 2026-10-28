import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("the public recovery page is routed and linked from sign-in and account",()=>{
 const app=read("src/App.jsx");
 const ui=read("src/RecoveryPage.jsx");
 const gate=read("src/native/web/AccountGate.jsx");
 const oauth=read("src/native/web/puppyOAuth.js");
 assert.match(app,/path==="\/recovery"\?"recovery"/);
 assert.match(app,/page==="recovery"\?<RecoveryPage\/>/);
 assert.match(gate,/href=\{recovery\?"\/account":"\/recovery"\}/);
 assert.match(oauth,/previous==="\/account"\|\|previous==="\/recovery"/);
 assert.match(ui,/beginPuppyDiscord\(\)/);
 assert.match(ui,/verifyPuppySession\(client\)/);
 assert.equal((app.match(/import RecoveryPage/g)||[]).length,1);
});

test("password reset requires a verified account session",()=>{
 const page=read("src/RecoveryPage.jsx");
 assert.match(page,/await verifyPuppySession\(client\)/);
 assert.match(page,/client\.auth\.updateUser\(\{password:newPassword\}\)/);
 assert.match(page,/account\.passwordLoginEnabled/);
 assert.doesNotMatch(page,/SUPABASE_SERVICE_ROLE_KEY|updateUserById|pup_account_saves/);
});

test("manual recovery is support-only, rate limited, and RLS protected",()=>{
 const edge=read("supabase/functions/pup-recovery/index.ts");
 const migration=read("supabase/migrations/20261028_pup_recovery_support_requests.sql");
 assert.match(edge,/body\.action!=="request"/);
 assert.match(edge,/body\.action==="status"/);
 assert.match(edge,/countRecent\("username_key"/);
 assert.match(edge,/countRecent\("email_key"/);
 assert.match(edge,/countRecent\("requester_digest"/);
 assert.match(edge,/reference=randomRef\(\)/);
 assert.match(edge,/contact_email:contactEmail/);
 assert.doesNotMatch(edge,/\.from\("pup_accounts"\)|updateUserById|resetPasswordForEmail/);
 assert.match(migration,/enable row level security/);
 assert.match(migration,/revoke all on public\.pup_recovery_requests from public,anon,authenticated/);
 assert.match(migration,/pending.*in_review.*resolved.*rejected/);
});

test("email recovery is restricted to Supabase-verified addresses with PKCE callback",()=>{
 const page=read("src/RecoveryPage.jsx");
 const backend=read("supabase/functions/pup-web-auth/index.ts");
 assert.match(page,/client\.auth\.updateUser\(\{email\}/);
 assert.match(page,/client\.auth\.resetPasswordForEmail\(address/);
 assert.match(page,/client\.auth\.exchangeCodeForSession\(code\)/);
 assert.match(page,/globalThis\.history\.replaceState/);
 assert.match(page,/await verifyPuppySession\(client\)/);
 assert.match(backend,/user\.email_confirmed_at/);
 assert.match(backend,/@accounts\.puppyclicker\.invalid/);
 assert.match(backend,/recoveryEmail:confirmedEmail/);
 assert.match(backend,/\.update\(\{email:confirmedEmail\}\)/);
 assert.doesNotMatch(page,/auth\.admin\./);
});
