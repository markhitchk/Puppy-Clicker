import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("password setup uses the authenticated Supabase Auth client",()=>{
 const ui=read("src/App.jsx");
 assert.match(ui,/client\.auth\.updateUser\(\{password\}\)/);
 assert.match(ui,/credential-check/);
 assert.match(ui,/credential-link/);
 assert.match(ui,/autoComplete="new-password"/);
 assert.match(ui,/Confirm password/);
 assert.doesNotMatch(ui,/service_role|SUPABASE_SERVICE_ROLE_KEY/);
});

test("username link checks account ownership and never receives a password",()=>{
 const edge=read("supabase/functions/pup-web-auth/index.ts");
 assert.match(edge,/const \{account,user\}=await currentSession\(req\)/);
 assert.match(edge,/PUP_ACCOUNT_AUTH_LINK_CONFLICT/);
 assert.match(edge,/\.eq\("account_uuid",account\.id\)/);
 assert.match(edge,/\.eq\("auth_user_id",user\.id\)/);
 assert.match(edge,/passwordLoginEnabled:credentials\?\.auth_user_id===user\.id/);
 assert.match(edge,/admin\.from\("pup_credential_links"\)\.insert/);
 assert.doesNotMatch(edge,/body\.password|password:body|updateUserById\(user\.id/);
});

test("credential setup does not overwrite cloud saves or Discord identity",()=>{
 const edge=read("supabase/functions/pup-web-auth/index.ts");
 const start=edge.indexOf('if(body.action==="credential-check"');
 const end=edge.indexOf('if(["cloud-save-read"',start);
 assert.ok(start>=0&&end>start);
 const setup=edge.slice(start,end);
 assert.doesNotMatch(setup,/\.from\("pup_account_saves"\)/);
 assert.doesNotMatch(setup,/\.update\(\{[^}]*discord_user_id/);
 assert.doesNotMatch(setup,/\.update\(\{[^}]*player_uuid/);
});
