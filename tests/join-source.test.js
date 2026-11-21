import test from "node:test";
import assert from "node:assert/strict";
import {resolveRegistrationMethod} from "../api/_lib/registrationMethod.js";
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
 for(const source of [edge,handler]){assert.ok(source.includes("parseJoinSource(body,PublicError)"));assert.ok(source.includes("recordJoinSource(admin,created.user.id,joinSource,"));}
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

test("permanent registration metadata and invite references remain service-only",()=>{
 const sql=read("supabase/registration-attribution.sql");
 assert.match(sql,/registration_method text/);
 assert.match(sql,/inviter_account_uuid uuid references puppy_accounts.pup_accounts/);
 assert.match(sql,/security_invoker = true/);
 assert.match(sql,/revoke all on public.pup_registration_sources from public, anon, authenticated/);
});

test("verified invite takes priority over manual discovery for both providers",async()=>{
 for(const method of ["password","discord"]){
  for(const answer of [{source:"tiktok",details:"manual answer"},{source:null,details:null}]){
   let inserted;
   const rows={pup_web_auth_links:{account_uuid:"new-account"},pupeye_players:{id:"inviter-player"},pup_accounts:{id:"inviter-account"}};
   const admin={from(table){
    if(table==="pup_registration_sources")return {async insert(row){inserted=row;return {error:null}}};
    assert.ok(table in rows);
    return {select(){return this},eq(key,value){
     if(key==="status")assert.equal(value,"active");
     if(key==="friend_code")assert.equal(value,"PUP-HARLEYTG-DEV");
     return this;
    },async maybeSingle(){return {data:rows[table]}}};
   }};
   await recordJoinSource(admin,"new-auth-user",answer,method,"pup-harleytg-dev");
   assert.deepEqual(inserted,{account_uuid:"new-account",source:"friend",details:null,registration_method:method,inviter_account_uuid:"inviter-account"});
  }
 }
});
test("unverified or self invites retain the optional manual answer",async()=>{
 for(const [code,player,inviter] of [["invalid",null,null],["PUP-1234-ABCD-5678",null,null],["PUP-HARLEYTG-DEV",{id:"p"},{id:"new-account"}],["PUP-HARLEYTG-DEV",{id:"p"},null]]){
  let inserted;
  const rows={pup_web_auth_links:{account_uuid:"new-account"},pupeye_players:player,pup_accounts:inviter};
  const admin={from(table){
   if(table==="pup_registration_sources")return {async insert(row){inserted=row;return {error:null}}};
   return {select(){return this},eq(){return this},async maybeSingle(){return {data:rows[table]}}};
  }};
  await recordJoinSource(admin,"new-auth-user",{source:"tiktok",details:"manual"},"password",code);
  assert.deepEqual(inserted,{account_uuid:"new-account",source:"tiktok",details:"manual",registration_method:"password",inviter_account_uuid:null});
 }
});
test("staff discovery takes precedence for existing verified invitation records",()=>{
 assert.ok(read("api/admin.js").includes('inviter_account_uuid?"invite_link"'));
 assert.ok(read("src/AdminPortal.jsx").includes('invite_link:"Invite link (automatic)"'));
 for(const path of ["src/WebRegister.jsx","src/DiscordSignupForm.jsx"])assert.ok(read(path).includes("inviteCode={inviteCode}"));
});

test("grouped discovery options stay aligned across signup, backend, admin and staged SQL",()=>{
 const ui=read("src/JoinSourceFields.jsx"),admin=read("src/AdminPortal.jsx"),sql=read("supabase/registration-attribution.sql");
 for(const source of ["snapchat","facebook","x","twitch"]){
  assert.deepEqual(parseJoinSource({joinSource:source},PublicError),{source,details:null});
  assert.ok(ui.includes('["'+source+'",'));
  assert.ok(admin.includes(source+':"'));
  assert.ok(sql.includes("'"+source+"'"));
 }
 assert.ok(ui.includes("<optgroup"));
 assert.ok(ui.includes("Select a discovery source"));
 assert.throws(()=>parseJoinSource({joinSource:"invite_link"},PublicError),/PUP_JOIN_SOURCE_INVALID/);
});

test("legacy accounts detect linked authentication without inventing original signup",()=>{
 const discordUserId="123456789012345678";
 assert.deepEqual(resolveRegistrationMethod({discordUserId}),{registrationMethod:null,detectedAuthMethods:["discord"]});
 assert.deepEqual(resolveRegistrationMethod({hasPassword:true}),{registrationMethod:null,detectedAuthMethods:["password"]});
 assert.deepEqual(resolveRegistrationMethod({hasPassword:true,discordUserId}),{registrationMethod:null,detectedAuthMethods:["password","discord"]});
 assert.deepEqual(resolveRegistrationMethod({storedMethod:"password",auditMethod:"discord",hasPassword:true,discordUserId}),{registrationMethod:"password",detectedAuthMethods:["password","discord"]});
 assert.deepEqual(resolveRegistrationMethod({auditMethod:"discord",hasPassword:true}),{registrationMethod:"discord",detectedAuthMethods:["password"]});
 assert.deepEqual(resolveRegistrationMethod({storedMethod:"tiktok",discordUserId:"invalid"}),{registrationMethod:null,detectedAuthMethods:[]});
 assert.deepEqual(resolveRegistrationMethod(),{registrationMethod:null,detectedAuthMethods:[]});
 const api=read("api/admin.js"),ui=read("src/AdminPortal.jsx");
 assert.ok(api.includes('db.from("pup_credential_links").select("account_uuid")'));
 assert.ok(ui.includes("Detected from account"));
 assert.ok(ui.includes("Method not recorded"));
});
