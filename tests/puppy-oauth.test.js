import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {PUPPY_DISCORD_CLIENT_ID,PUPPY_DISCORD_REDIRECT_URI} from "../src/native/web/puppyOAuth.js";
const source=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("Puppy Discord uses the Android application's client ID",()=>{
 assert.equal(PUPPY_DISCORD_CLIENT_ID,"1547982688898777118");
 assert.equal(PUPPY_DISCORD_REDIRECT_URI,"https://puppy-clicker.vercel.app/auth/discord/callback");
});
test("the website cannot silently use the ARC Raiders shared Discord provider",()=>{
 const gate=source("src/native/web/AccountGate.jsx");
 const helper=source("src/native/web/puppyOAuth.js");
 assert.doesNotMatch(gate,/signInWithOAuth|provider:\s*["']discord/);
 assert.doesNotMatch(helper,/signInWithOAuth|provider:\s*["']discord/);
 assert.match(helper,/code_challenge_method:"S256"/);
 assert.match(gate,/verifyPuppySession/);
});
test("private Pup Account link is RLS-protected and binds an authenticated user",()=>{
 const sql=source("supabase/migrations/20261028095500_pup_web_auth_links.sql");
 assert.match(sql,/alter table public\.pup_web_auth_links enable row level security/);
 assert.match(sql,/auth_user_id uuid not null unique/);
 assert.match(sql,/revoke all on public\.pup_web_auth_links/);
 const edge=source("supabase/functions/pup-web-auth/index.ts");
 assert.match(edge,/accountForDiscord/);
 assert.match(edge,/accountAllowed/);
 assert.match(edge,/PUP_ACCOUNT_SESSION_REQUIRED/);
});
