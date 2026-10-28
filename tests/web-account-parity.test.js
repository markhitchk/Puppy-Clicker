import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("web Account Details exposes the same signed-in public metadata as Android",()=>{
 const web=read("src/App.jsx");
 const android=read("src/native/src/components/AccountDetailsScreen.jsx");
 for(const label of ["Account username","Display name","Friend Code","Account standing","Role","Account connection","Gameplay access"]){
  assert.ok(android.includes(label),"Android details missing: "+label);
  assert.ok(web.includes(label),"Web details missing: "+label);
 }
 assert.match(web,/profile\.friendCode/);
 assert.match(web,/shareFriendCode/);
 assert.match(web,/profile\.guildRole/);
 assert.match(web,/profile\.gameplayWritable/);
 assert.match(web,/profile\.linkedFromPlay/);
 assert.match(web,/cloud\.updatedAt/);
});

test("status endpoint returns server-owned fields for only the authenticated player",()=>{
 const auth=read("supabase/functions/pup-web-auth/index.ts");
 assert.match(auth,/const \{account\}=await currentSession\(req\)/);
 assert.match(auth,/admin\.from\("pupeye_players"\)\.select\("friend_code,guild_role"\)/);
 assert.match(auth,/\.eq\("id",account\.player_uuid\)/);
 assert.match(auth,/\.eq\("player_uuid",account\.player_uuid\)/);
 assert.match(auth,/friendCode:player\?\.friend_code/);
 assert.match(auth,/guildRole:player\?\.guild_role/);
 assert.match(auth,/gameplayWritable:connected/);
 assert.match(auth,/contactEmail:account\.contact_email/);
 assert.doesNotMatch(read("src/App.jsx"),/profile\.id|profile\.playerUuid|profile\.installationId|cloud\.revision/);
});

test("account details remain usable if cloud backup is temporarily unavailable",()=>{
 const web=read("src/App.jsx");
 assert.match(web,/Account identity remains verified even if the cloud endpoint is temporarily unavailable/);
 assert.match(web,/Cloud status unavailable/);
 assert.match(web,/Refresh account details/);
 assert.match(web,/Sign out/);
});
