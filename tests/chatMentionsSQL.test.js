import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
test("SQL accepts only verified same-server member mentions in clean v2 messages",()=>{
 const sql=readFileSync(new URL("../supabase/migrations/20261031_pupeye_member_mentions_v3.sql",import.meta.url),"utf8");
 assert.match(sql,/join puppy_social\.memberships member/);
 assert.match(sql,/member\.server_id=v_server/);
 assert.match(sql,/lower\(a\.username\)=v_mention/);
 assert.match(sql,/and v_mentions_ok/);
 assert.match(sql,/and p_screening_codes='\{\}'::text\[\]/);
 assert.match(sql,/and v_safe_text !~\*/);
 assert.match(sql,/p_text !~\* '\[A-Za-z0-9/);
 assert.match(sql,/revoke execute.*anon,authenticated/);
});
test("API scopes mentions to a joined server and retains no public member identifiers",()=>{
 const chat=readFileSync(new URL("../api/chat.js",import.meta.url),"utf8");
 assert.match(chat,/async function mentionSuggestions/);
 assert.match(chat,/await requireMember\(db,account,channel\.server_id\)/);
 assert.match(chat,/case "mentions"/);
 assert.match(chat,/CHAT_UNKNOWN_MENTION/);
 assert.match(chat,/\.eq\("server_id",channel\.server_id\)/);
});
