import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 sanitizeDiscordIdentity,makeDiscordSignupTicket,verifyDiscordSignupTicket
} from "../supabase/functions/pup-web-auth/discordSignup.ts";

const secret="unit-test-signup-secret-not-production-32-characters";
const profile={id:"1547982688898777118",username:"midnight_pup",
 global_name:"Midnight Pup",avatar:"a_123abc",verified:true,email:"Test@Example.com"};
test("Discord identity preserves approved user fields and normalizes verified email",()=>{
 const p=sanitizeDiscordIdentity(profile);
 assert.equal(p.id,profile.id);
 assert.equal(p.username,"midnight_pup");
 assert.equal(p.globalName,"Midnight Pup");
 assert.equal(p.avatarHash,"a_123abc");
 assert.equal(p.email,"test@example.com");
 assert.equal(sanitizeDiscordIdentity({...profile,verified:false}).email,null);
 assert.equal(sanitizeDiscordIdentity({...profile,email:null}).email,null);
 assert.throws(()=>sanitizeDiscordIdentity({...profile,id:"bad"}));
});
test("short-lived signed ticket works with valid identity and expires",()=>{
 const p=sanitizeDiscordIdentity(profile);
 const ticket=makeDiscordSignupTicket(p,secret,1_000_000);
 assert.deepEqual(verifyDiscordSignupTicket(ticket,secret,1_000_100),p);
 assert.throws(()=>verifyDiscordSignupTicket(ticket,secret,1_600_001));
 assert.throws(()=>verifyDiscordSignupTicket(ticket,secret+"mismatch",1_000_100));
 const [head,tail]=ticket.split(".");
 assert.throws(()=>verifyDiscordSignupTicket(head+"."+(tail[0]==="A"?"B":"A")+tail.slice(1),secret,1_000_100));
});
test("web OAuth always requests identify and email, never shared Supabase OAuth",()=>{
 const web=readFileSync(new URL("../src/native/web/puppyOAuth.js",import.meta.url),"utf8");
 assert.match(web,/scope:"identify email"/);
 assert.match(web,/registration_required/);
 assert.ok(web.includes('sessionStorage?.setItem(SIGNUP_KEY'));
 assert.ok(!web.includes("signInWithOAuth("));
});
test("Discord registration is explicit and preserves existing linked account identities",()=>{
 const server=readFileSync(new URL("../supabase/functions/pup-web-auth/discordRegistration.ts",import.meta.url),"utf8");
 const sql=readFileSync(new URL("../supabase/sql/discord_web_signup_draft.sql",import.meta.url),"utf8");
 assert.ok(server.includes('if(account)throw new PublicError(409,"PUP_DISCORD_ALREADY_LINKED")'));
 assert.ok(server.includes('if(player)throw new PublicError(409,"PUP_ACCOUNT_LINK_REQUIRED")'));
 assert.ok(server.includes("body.useDiscordEmail===true?profile.email:null"));
 assert.ok(sql.includes("revoke all on function public.register_pup_web_discord_account"));
 assert.ok(sql.includes("to service_role"));
 assert.match(sql,/pup_web_auth_links\s*\(\s*account_uuid\s*,\s*auth_user_id\s*,\s*discord_user_id\s*\)/);
 assert.ok(!sql.includes("SECURITY DEFINER"));
});
