import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=file=>readFileSync(new URL("../"+file,import.meta.url),"utf8");

test("/recovery exposes both verified and manual support options",()=>{
 const app=read("src/App.jsx");
 const oauth=read("src/native/web/puppyOAuth.js");
 const gate=read("src/native/web/AccountGate.jsx");
 assert.match(app,/page==="recovery"\?<RecoveryPortal\/>/);
 assert.match(app,/import ManualRecovery from "\.\/ManualRecovery\.jsx"/);
 assert.match(app,/<WebAccountGate><RecoveryPage\/><\/WebAccountGate><ManualRecovery\/>/);
 assert.match(oauth,/previous==="\/recovery"/);
 assert.match(gate,/recovery\?"\/recovery"/);
});

test("manual recovery cannot change account ownership or reveal account existence",()=>{
 const edge=read("supabase/functions/pup-recovery/index.ts");
 assert.match(edge,/body\.action==="request"/);
 assert.match(edge,/body\.action==="status"/);
 assert.match(edge,/countRecent\("username_key"/);
 assert.match(edge,/countRecent\("requester_digest"/);
 assert.doesNotMatch(edge,/updateUserById|generateLink|signInWithPassword|\bresetPasswordForEmail\b/);
 assert.doesNotMatch(edge,/\.from\("pup_accounts"\)/);
 assert.doesNotMatch(edge,/\.from\("pup_account_saves"\)/);
 const sql=read("supabase/migrations/20261028_pup_recovery_support_requests.sql");
 assert.match(sql,/enable row level security/);
 assert.match(sql,/revoke all on public\.pup_recovery_requests from public,anon,authenticated/);
});

test("manual form excludes credentials and supports reference lookup",()=>{
 const ui=read("src/ManualRecovery.jsx");
 assert.match(ui,/action:"request"/);
 assert.match(ui,/action:"status"/);
 assert.match(ui,/reference:data\.reference/);
 assert.match(ui,/Contact email for staff follow-up/);
 assert.doesNotMatch(ui,/password:/);
 assert.doesNotMatch(ui,/cloud-save-write|account-update|credential-link/);
});
