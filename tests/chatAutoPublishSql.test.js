import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
test("database migration only publishes v2 unflagged text, legacy stays pending",()=>{
 const sql=readFileSync(new URL("../supabase/migrations/20261031_pupeye_chat_auto_publish_v2.sql",import.meta.url),"utf8");
 assert.match(sql,/p_screening_version=2/);
 assert.match(sql,/p_screening_codes='\{\}'::text\[\]/);
 assert.match(sql,/v_state:=case when/);
 assert.match(sql,/then 'published' else 'pending' end/);
 assert.match(sql,/revoke execute.*anon,authenticated/);
 assert.match(sql,/moderation_reason/);
});
test("API reads the persisted state before returning a publish receipt",()=>{
 const api=readFileSync(new URL("../api/chat.js",import.meta.url),"utf8");
 assert.match(api,/select\("state"\)/);
 assert.match(api,/PUPPY_CHAT_AUTO_PUBLISH/);
 assert.match(api,/published\?"published":"pending"/);
});
