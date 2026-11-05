import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {parseJoinSource,recordJoinSource} from "../supabase/functions/pup-web-auth/joinSource.ts";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
class PublicError extends Error{constructor(status,code){super(code);this.status=status;}}
test("attribution is optional and validates input",()=>{
 assert.deepEqual(parseJoinSource({},PublicError),{source:null,details:null});
 assert.deepEqual(parseJoinSource({joinSource:"friend",joinDetails:"  @player  "},PublicError),{source:"friend",details:"@player"});
 assert.throws(()=>parseJoinSource({joinSource:"invalid"},PublicError),/PUP_JOIN_SOURCE_INVALID/);
 assert.throws(()=>parseJoinSource({joinSource:"discord",joinDetails:"x".repeat(121)},PublicError),/PUP_JOIN_SOURCE_INVALID/);
 assert.throws(()=>parseJoinSource({joinSource:"",joinDetails:"x"},PublicError),/PUP_JOIN_SOURCE_INVALID/);
});
test("both sign-up providers send the answer and server validates it",()=>{
 const web=read("src/WebRegister.jsx"),discord=read("src/DiscordSignupForm.jsx");
 const edge=read("supabase/functions/pup-web-auth/index.ts"),handler=read("supabase/functions/pup-web-auth/discordRegistration.ts");
 for(const form of [web,discord]){assert.ok(form.includes("JoinSourceFields"));assert.ok(form.includes("joinSource:joinSource||null"));}
 for(const source of [edge,handler]){assert.ok(source.includes("parseJoinSource(body,PublicError)"));assert.ok(source.includes("recordJoinSource(admin,created.user.id,joinSource)"));}
});
test("server derives account from verified user; never accepts a player ID",async()=>{
 let inserted;
 const admin={from(table){
  if(table==="pup_web_auth_links")return {select(){return this},eq(name,id){assert.equal(name,"auth_user_id");assert.equal(id,"new-auth-user");return this},async maybeSingle(){return {data:{account_uuid:"uuid-1"}}}};
  if(table==="pup_registration_sources")return {async insert(row){inserted=row;return {error:null}}};
  throw Error("unexpected table");
 }};
 await recordJoinSource(admin,"new-auth-user",{source:"discord",details:"Indie Game Hub"});
 assert.deepEqual(inserted,{account_uuid:"uuid-1",source:"discord",details:"Indie Game Hub"});
});
test("staff directory is the only UI reading attribution",()=>{
 assert.ok(read("api/admin.js").includes('db.from("pup_registration_sources")'));
 assert.ok(read("src/AdminPortal.jsx").includes("Joined via"));
 const sql=read("supabase/migrations/20261104162300_web_registration_sources.sql");
 assert.ok(sql.includes("enable row level security"));
 assert.ok(sql.includes("revoke all on public.pup_registration_sources from public, anon, authenticated"));
});
