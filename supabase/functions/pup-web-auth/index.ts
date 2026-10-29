import {createClient} from "npm:@supabase/supabase-js@2.117.1";
import {crossPlay,CrossPlayError} from "./crossPlay.ts";
import {newBetaKotlinSave} from "../_shared/beta-economy.ts";
import {createHash} from "node:crypto";
import {offerDiscordRegistration,registerDiscordWebAccount} from "./discordRegistration.ts";

// This is Puppy Clicker's own public OAuth2 application (same client ID as
// the Android DiscordSignupAuth). Do not use shared Supabase Discord OAuth.
export const PUPPY_DISCORD_CLIENT_ID = "1547982688898777118";
export const PUPPY_WEB_REDIRECT_URI =
  "https://puppy-clicker.vercel.app/auth/discord/callback";
// Preserve the Android relay callback for any already-started sessions.
// Only exact, preapproved website origins may supply browser OAuth codes.
const ALLOWED_DISCORD_REDIRECTS = new Set([
  PUPPY_WEB_REDIRECT_URI,
  "discord-1547982688898777118:/authorize/callback",
  "http://localhost:5173/auth/discord/callback",
  "http://127.0.0.1:4173/auth/discord/callback"
]);
const SAFE_ORIGINS = new Set(["https://puppy-clicker.vercel.app",
  "http://127.0.0.1:4173","http://localhost:5173"]);
const json=(status,body,origin)=>new Response(JSON.stringify(body),{
 status,headers:{"content-type":"application/json","cache-control":"no-store",
  "access-control-allow-origin":SAFE_ORIGINS.has(origin)?origin:"https://puppy-clicker.vercel.app",
  "access-control-allow-headers":"authorization,apikey,content-type,x-client-info",
  "access-control-allow-methods":"POST,OPTIONS",
  "vary":"Origin"}
});
class PublicError extends Error{
 constructor(status,code){super(code);this.status=status;this.code=code;}
}
function required(value,pattern,code){
 if(typeof value!=="string"||!pattern.test(value))throw new PublicError(400,code);
 return value;
}
const url=Deno.env.get("SUPABASE_URL");
const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const publicKey=Deno.env.get("SUPABASE_ANON_KEY") ||
  Object.values(JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")||"{}")).find(v=>typeof v==="string");
if(!url||!key||!publicKey)throw Error("Puppy Clicker Auth server configuration missing");
const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const auth=createClient(url,publicKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});

// Banned users may authenticate to view a restricted standing notice;
// all gameplay and account mutations still fail closed on the server.
async function accountAllowed(account,allowSanctioned=false){
 if(!account || !["active","blocked"].includes(account.status))
  throw new PublicError(403,"PUP_ACCOUNT_NOT_AVAILABLE");
 if(Number(account.terms_version)<1||Number(account.privacy_version)<1
   ||!account.terms_accepted_at||!account.privacy_accepted_at)
  throw new PublicError(403,"PUP_ACCOUNT_LEGAL_REQUIRED");
 const playerId=required(account.player_uuid,/^[0-9a-f-]{36}$/i,"PUP_ID_INVALID");
 const predicates=["player_uuid.eq."+playerId];
 if(account.discord_user_id)predicates.push("discord_user_id.eq."+
   required(account.discord_user_id,/^\d{15,22}$/,"DISCORD_ID_INVALID"));
 const {data:targets,error:te}=await admin.from("pupeye_ban_targets")
  .select("ban_uuid").or(predicates.join(","));
 if(te)throw new PublicError(503,"PUP_ENFORCEMENT_UNAVAILABLE");
 const ids=[...new Set((targets||[]).map(t=>t.ban_uuid).filter(Boolean))];
 let active=[];
 if(ids.length){
  const {data:bans,error:be}=await admin.from("pupeye_global_bans")
   .select("id,public_ban_id,kind,public_reason,issued_at,status,expires_at,revoked_at")
   .in("id",ids).eq("status","active");
  if(be)throw new PublicError(503,"PUP_ENFORCEMENT_UNAVAILABLE");
  active=(bans||[]).filter(b=>!b.revoked_at&&(!b.expires_at||Date.parse(b.expires_at)>Date.now()));
 }
 if(account.status!=="blocked"&&!active.length)return null;
 const ban=active.sort((a,b)=>Date.parse(b.issued_at||0)-Date.parse(a.issued_at||0))[0];
 if(!allowSanctioned)throw new PublicError(403,"PUP_ACCOUNT_BLOCKED");
 return {
  id:ban?.public_ban_id||null,
  reason:ban?.public_reason||"Your Pup Account has been restricted.",
  issuedAt:ban?.issued_at||null,
  expiresAt:ban?.expires_at||null,
  permanent:!ban?.expires_at
 };
}
async function accountForDiscord(discordId){
 const {data,error}=await admin.from("pup_accounts").select(
   "id,player_uuid,active_installation_uuid,discord_user_id,username,display_name,status,terms_version,privacy_version,terms_accepted_at,privacy_accepted_at"
 ).eq("discord_user_id",discordId).maybeSingle();
 if(error)throw new PublicError(503,"PUP_ACCOUNT_LOOKUP_FAILED");
 if(!data)throw new PublicError(403,"PUP_ACCOUNT_LINK_REQUIRED");
 await accountAllowed(data,true);
 return data;
}
async function accountForCredentials(login){
 const {data,error}=await admin.from("pup_accounts").select(
  "id,player_uuid,active_installation_uuid,discord_user_id,username,display_name,status,terms_version,privacy_version,terms_accepted_at,privacy_accepted_at"
 ).ilike("username",login).maybeSingle();
 if(error)throw new PublicError(503,"PUP_ACCOUNT_LOOKUP_FAILED");
 if(!data)throw new PublicError(401,"PUP_SIGNIN_INVALID");
 await accountAllowed(data,true);
 return data;
}
async function linkedAuthUser(account){
 const [{data:existing,error:ee},{data:credential,error:ce}]=await Promise.all([
  admin.from("pup_web_auth_links").select("auth_user_id,discord_user_id")
   .eq("account_uuid",account.id).maybeSingle(),
  admin.from("pup_credential_links").select("auth_user_id,email")
   .eq("account_uuid",account.id).maybeSingle()
 ]);
 if(ee||ce)throw new PublicError(503,"PUP_ACCOUNT_LOOKUP_FAILED");
 if(existing&&credential&&existing.auth_user_id!==credential.auth_user_id)
  throw new PublicError(409,"PUP_ACCOUNT_AUTH_LINK_CONFLICT");
 if(existing&&existing.discord_user_id&&account.discord_user_id
    &&existing.discord_user_id!==account.discord_user_id)
  throw new PublicError(409,"PUP_ACCOUNT_IDENTITY_CONFLICT");
 if(existing)return existing.auth_user_id;
 let targetId=credential?.auth_user_id||null;
 let created=false;
 let email=credential?.email||null;
 if(!targetId){
  email="pup-web-"+crypto.randomUUID()+"@accounts.puppyclicker.invalid";
  const {data:newUser,error:createError}=await admin.auth.admin.createUser({
   email,email_confirm:true,app_metadata:{puppy_clicker_web:true}
  });
  if(createError||!newUser?.user)throw new PublicError(503,"PUP_WEB_ACCOUNT_SETUP_FAILED");
  targetId=newUser.user.id;created=true;
 }
 const {error:linkError}=await admin.from("pup_web_auth_links").insert({
  account_uuid:account.id,auth_user_id:targetId,discord_user_id:account.discord_user_id||null
 });
 if(linkError){
  if(created)await admin.auth.admin.deleteUser(targetId).catch(()=>{});
  throw new PublicError(409,"PUP_WEB_AUTH_LINK_CONFLICT");
 }
 return targetId;
}
async function currentSession(req,allowSanctioned=false){
 const bearer=req.headers.get("Authorization")||"";
 if(!/^Bearer\s+\S+$/.test(bearer))throw new PublicError(401,"PUP_AUTH_REQUIRED");
 const token=bearer.replace(/^Bearer\s+/,"");
 const {data,error}=await auth.auth.getUser(token);
 if(error||!data?.user)throw new PublicError(401,"PUP_AUTH_REQUIRED");
 const {data:link,error:le}=await admin.from("pup_web_auth_links")
  .select("account_uuid").eq("auth_user_id",data.user.id).maybeSingle();
 if(le)throw new PublicError(503,"PUP_ACCOUNT_LOOKUP_FAILED");
 if(!link)throw new PublicError(403,"PUP_ACCOUNT_SESSION_REQUIRED");
 const {data:account,error:ae}=await admin.from("pup_accounts").select(
  "id,player_uuid,active_installation_uuid,discord_user_id,username,display_name,contact_email,status,terms_version,privacy_version,terms_accepted_at,privacy_accepted_at,origin_platform"
 ).eq("id",link.account_uuid).maybeSingle();
 if(ae)throw new PublicError(503,"PUP_ACCOUNT_LOOKUP_FAILED");
 const sanction=await accountAllowed(account,allowSanctioned);
 return {account,user:data.user,sanction};
}

// Web signup is for NEW identities only: never claim Android installations.
async function registerWebAccount(req,body,origin){
 const username=required(body.username,/^[A-Za-z0-9_-]{3,20}$/,"PUP_USERNAME_INVALID");
 const password=required(body.password,/^[\s\S]{8,128}$/,"PUP_PASSWORD_INVALID");
 if(body.termsAccepted!==true||body.privacyAccepted!==true)
  throw new PublicError(400,"PUP_LEGAL_ACCEPTANCE_REQUIRED");
 const contactEmail=body.contactEmail==null?"":typeof body.contactEmail==="string"?
  body.contactEmail.trim().toLowerCase():null;
 if(contactEmail===null||contactEmail.length>254||
    (contactEmail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)))
  throw new PublicError(400,"PUP_CONTACT_EMAIL_INVALID");
 const network=req.headers.get("cf-connecting-ip")||
  req.headers.get("x-real-ip")||
  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"unknown";
 const ipHash=createHash("sha256").update("pup-web-signup:"+network).digest("hex");
 const {data:admitted,error:budgetError}=await admin.rpc("consume_pup_web_signup_budget",
  {p_ip_hash:ipHash});
 if(budgetError)throw new PublicError(503,"PUP_SIGNUP_LIMIT_UNAVAILABLE");
 if(admitted!==true)throw new PublicError(429,"PUP_SIGNUP_RATE_LIMIT");
 const internalEmail="pup-web-"+crypto.randomUUID()+"@accounts.puppyclicker.invalid";
 const {data:created,error:creationError}=await admin.auth.admin.createUser({
  email:internalEmail,email_confirm:true,password,
  app_metadata:{puppy_clicker_web:true}
 });
 if(creationError){
  // Give a useful public validation error, never raw Supabase Auth diagnostics.
  if(creationError.code==="weak_password"||
     (creationError.status===422&&/password/i.test(creationError.message||"")))
   throw new PublicError(422,"PUP_PASSWORD_COMPLEXITY_REQUIRED");
  throw new PublicError(503,"PUP_SIGNUP_UNAVAILABLE");
 }
 if(!created?.user)throw new PublicError(503,"PUP_SIGNUP_UNAVAILABLE");
 const save=newBetaKotlinSave();
 const saveHash=createHash("sha256").update(JSON.stringify(save)).digest("hex");
 const {error:registrationError}=await admin.rpc("register_pup_web_account",{
  p_auth_user_id:created.user.id,p_username:username,
  p_contact_email:contactEmail||null,p_email:internalEmail,
  p_save_data:save,p_payload_hash:saveHash
 });
 if(registrationError){
  await admin.auth.admin.deleteUser(created.user.id).catch(()=>{});
  if(registrationError.code==="23505"||
     /PUP_USERNAME_TAKEN/.test(registrationError.message||""))
   throw new PublicError(409,"PUP_USERNAME_TAKEN");
  throw new PublicError(503,"PUP_SIGNUP_UNAVAILABLE");
 }
 // The new account remains usable via password login if auto-sign-in fails.
 const {data:signed,error:signError}=await auth.auth.signInWithPassword({
  email:internalEmail,password
 });
 if(signError||!signed?.session)
  return json(201,{registered:true,signInRequired:true},origin);
 return json(201,{registered:true,
  access_token:signed.session.access_token,
  refresh_token:signed.session.refresh_token},origin);
}

Deno.serve(async req=>{
 const origin=req.headers.get("origin")||"";
 if(req.method==="OPTIONS")return json(200,{},origin);
 if(req.method!=="POST")return json(405,{error:"METHOD_NOT_ALLOWED"},origin);
 if(!SAFE_ORIGINS.has(origin))return json(403,{error:"ORIGIN_NOT_ALLOWED"},origin);
 try{
  const body=await req.json();
  if(!body||typeof body!=="object")throw new PublicError(400,"PUP_REQUEST_INVALID");
  if(body.action==="register")return await registerWebAccount(req,body,origin);
   if(body.action==="discord-register")return await registerDiscordWebAccount({
    req,body,origin,admin,json,PublicError,key,newBetaKotlinSave
   });
   if(body.action==="notifications-read"){
    // Derive recipient exclusively from the verified Supabase Auth session.
    // A browser cannot select another player's inbox by supplying an ID.
    const {account}=await currentSession(req);
    const {data,error}=await admin.from("pup_system_notifications")
     .select("id,kind,title,body,created_at,read_at")
     .eq("player_uuid",account.player_uuid)
     .is("dismissed_at",null)
     .order("created_at",{ascending:false}).limit(100);
    if(error)throw new PublicError(503,"PUP_NOTIFICATIONS_UNAVAILABLE");
    return json(200,{notifications:(data||[]).map(row=>({
     id:row.id,kind:row.kind,title:row.title,body:row.body,
     createdAt:row.created_at,read:row.read_at!==null
    }))},origin);
   }
   if(body.action==="notifications-mark"){
    const {account}=await currentSession(req);
    const mode=body.mode;
    if(!["read-one","read-all","clear-read"].includes(mode))
     throw new PublicError(400,"PUP_NOTIFICATION_ACTION_INVALID");
    const now=new Date().toISOString();
    let update=admin.from("pup_system_notifications")
     .update(mode==="clear-read"?{dismissed_at:now}:{read_at:now})
     .eq("player_uuid",account.player_uuid).is("dismissed_at",null);
    if(mode==="read-one"){
     if(typeof body.id!=="string"||!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(body.id))
      throw new PublicError(400,"PUP_NOTIFICATION_ID_INVALID");
     update=update.eq("id",body.id).is("read_at",null);
    }else if(mode==="read-all")update=update.is("read_at",null);
    else update=update.not("read_at","is",null);
    const {error}=await update;
    if(error)throw new PublicError(503,"PUP_NOTIFICATIONS_UNAVAILABLE");
    return json(200,{updated:true},origin);
   }
   if(body.action==="status"){
    const {account,user,sanction}=await currentSession(req,true);
    if(sanction)return json(200,{verified:true,account:{
      id:account.id,username:account.username,displayName:account.display_name||account.username,
      status:"BANNED",ban:sanction,gameplayWritable:false
    }},origin);
   // These public-facing details are read only from the authenticated owner's
   // authoritative player and save records, never from browser-supplied IDs.
   const [{data:player,error:pe},{data:installation,error:ie},
    {data:save,error:se},{data:credentials,error:ce}]=await Promise.all([
    admin.from("pupeye_players").select("friend_code,guild_role,discord_username,discord_global_name,discord_avatar_hash,discord_email")
     .eq("id",account.player_uuid).maybeSingle(),
    account.active_installation_uuid
     ? admin.from("pupeye_installations").select("player_uuid,active,revoked_at")
       .eq("id",account.active_installation_uuid).maybeSingle()
     : Promise.resolve({data:null,error:null}),
    admin.from("pup_account_saves").select("account_uuid,origin_platform,installation_uuid")
     .eq("player_uuid",account.player_uuid).maybeSingle(),
    admin.from("pup_credential_links").select("auth_user_id,email")
     .eq("account_uuid",account.id).maybeSingle()
   ]);
   if(pe||ie||se||ce)throw new PublicError(503,"PUP_ACCOUNT_DETAILS_UNAVAILABLE");
   // A support contact is NOT a recovery email. Only the email verified
   // directly by Supabase Auth can receive a real password reset link.
   const confirmedEmail=typeof user.email==="string"&&user.email_confirmed_at
    &&!user.email.toLowerCase().endsWith("@accounts.puppyclicker.invalid")
    ?user.email.toLowerCase():null;
   // A confirmed Auth email change must also update the native/web username
   // credential mapping. Otherwise Android password sign-in would still try
   // the previous synthetic email and stop working after email verification.
   if(confirmedEmail&&credentials?.auth_user_id===user.id
      &&credentials.email?.toLowerCase()!==confirmedEmail){
    const {error:syncError}=await admin.from("pup_credential_links")
     .update({email:confirmedEmail}).eq("account_uuid",account.id)
     .eq("auth_user_id",user.id);
    if(syncError)throw new PublicError(503,"PUP_RECOVERY_EMAIL_SYNC_UNAVAILABLE");
   }
   const owned=!!installation&&installation.player_uuid===account.player_uuid
    &&installation.active===true&&!installation.revoked_at;
   const connected=owned&&save?.account_uuid===account.id;
   const webOnly=account.origin_platform==="web"&&!account.active_installation_uuid&&
    save?.account_uuid===account.id&&save?.origin_platform==="web"&&
    save?.installation_uuid===null;
   return json(200,{verified:true,account:{
    id:account.id,username:account.username,
    displayName:account.display_name||account.username,
    discordUserId:account.discord_user_id||null,
    friendCode:player?.friend_code||null,
    guildRole:player?.guild_role||null,
    status:"VERIFIED",
    linkedFromPlay:webOnly?null:connected,
    webOnly,
    gameplayWritable:webOnly||connected,
    passwordLoginEnabled:credentials?.auth_user_id===user.id,
    recoveryEmail:confirmedEmail,
    contactEmail:account.contact_email||null,
    discordProfile:account.discord_user_id?{
     id:account.discord_user_id,
     username:player?.discord_username||null,
     displayName:player?.discord_global_name||player?.discord_username||null,
     avatarUrl:player?.discord_avatar_hash
      ?"https://cdn.discordapp.com/avatars/"+account.discord_user_id+
       "/"+player.discord_avatar_hash+".png":null,
     email:player?.discord_email||null
    }:null
   }},origin);
  }

  if(body.action==="credential-check"||body.action==="credential-link"){
   // Account ownership is resolved ONLY from the current verified session.
   // No username, user ID or account ID sent by the browser is used to select
   // another account. The password itself is changed through the signed-in
   // Supabase Auth client, not through this endpoint or a SQL statement.
   const {account,user}=await currentSession(req);
   const username=required(body.username,/^[A-Za-z0-9_-]{3,20}$/,"PUP_USERNAME_INVALID");
   const [{data:taken,error:te},{data:pending,error:pe},
    {data:credential,error:ce},{data:identityLink,error:ie}]=await Promise.all([
    admin.from("pup_accounts").select("id").ilike("username",username).maybeSingle(),
    admin.from("pup_credential_pending").select("username").ilike("username",username).maybeSingle(),
    admin.from("pup_credential_links").select("auth_user_id,email")
     .eq("account_uuid",account.id).maybeSingle(),
    admin.from("pup_credential_links").select("account_uuid")
     .eq("auth_user_id",user.id).maybeSingle()
   ]);
   if(te||pe||ce||ie)throw new PublicError(503,"PUP_CREDENTIAL_LOOKUP_FAILED");
   if((taken&&taken.id!==account.id)||pending)
    throw new PublicError(409,"PUP_USERNAME_TAKEN");
   if((credential&&credential.auth_user_id!==user.id)
      ||(identityLink&&identityLink.account_uuid!==account.id))
    throw new PublicError(409,"PUP_ACCOUNT_AUTH_LINK_CONFLICT");
   if(body.action==="credential-check")
    return json(200,{available:true,username},origin);
   if(!user.email)throw new PublicError(503,"PUP_CREDENTIAL_EMAIL_MISSING");
   if(account.username!==username){
    const {error:ue}=await admin.from("pup_accounts")
     .update({username,updated_at:new Date().toISOString()})
     .eq("id",account.id).eq("status","active");
    if(ue)throw new PublicError(409,"PUP_USERNAME_TAKEN");
   }
   if(!credential){
    const {error:le}=await admin.from("pup_credential_links").insert({
     auth_user_id:user.id,account_uuid:account.id,email:user.email
    });
    if(le)throw new PublicError(409,"PUP_CREDENTIAL_LINK_FAILED");
   }
   // Keep Android's public player name in sync, without altering ownership,
   // installation IDs, Discord identities, save balances or inventory.
   if(account.username!==username){
    const {error:playerError}=await admin.from("pupeye_players")
     .update({username,updated_at:new Date().toISOString()})
     .eq("id",account.player_uuid);
    if(playerError)console.error("Pup player name sync unavailable");
   }
   return json(200,{updated:true,username,passwordLoginEnabled:true},origin);
  }
  if(["cloud-save-read","gameplay","account-update"].includes(body.action)){
   const {account}=await currentSession(req);
   const outcome=await crossPlay(admin,account,body);
   return json(200,outcome,origin);
  }
  if(body.action==="password-login"){
   const login=required(body.login,/^[A-Za-z0-9_-]{3,20}$/,"PUP_SIGNIN_INVALID");
   const password=required(body.password,/^[\s\S]{1,128}$/,"PUP_SIGNIN_INVALID");
   const account=await accountForCredentials(login);
   const {data:link,error:le}=await admin.from("pup_credential_links")
    .select("auth_user_id,email").eq("account_uuid",account.id).maybeSingle();
   if(le||!link)throw new PublicError(401,"PUP_SIGNIN_INVALID");
   const {data:signed,error:se}=await auth.auth.signInWithPassword({
    email:link.email,password
   });
   if(se||!signed?.session||signed.user?.id!==link.auth_user_id)
    throw new PublicError(401,"PUP_SIGNIN_INVALID");
   const uid=await linkedAuthUser(account);
   if(uid!==signed.user.id)throw new PublicError(403,"PUP_ACCOUNT_AUTH_LINK_CONFLICT");
   return json(200,{access_token:signed.session.access_token,
    refresh_token:signed.session.refresh_token},origin);
  }
  if(body.action!=="discord-exchange")throw new PublicError(400,"PUP_ACTION_INVALID");
  const redirectUri=body.redirectUri;
  if(typeof redirectUri!=="string"||!ALLOWED_DISCORD_REDIRECTS.has(redirectUri))
    throw new PublicError(400,"DISCORD_REDIRECT_INVALID");
  const code=required(body.code,/^[\w-]{8,2048}$/,"DISCORD_CODE_INVALID");
  const verifier=required(body.verifier,/^[A-Za-z0-9_.~-]{43,128}$/,"DISCORD_PKCE_INVALID");
  const form=new URLSearchParams({
   client_id:PUPPY_DISCORD_CLIENT_ID,grant_type:"authorization_code",
   code,redirect_uri:redirectUri,code_verifier:verifier
  });
  const exchanged=await fetch("https://discord.com/api/oauth2/token",{
   method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},
   body:form.toString()
  });
  if(!exchanged.ok)throw new PublicError(401,"PUP_DISCORD_EXCHANGE_FAILED");
  const token=await exchanged.json();
  if(typeof token.access_token!=="string")
   throw new PublicError(401,"PUP_DISCORD_EXCHANGE_FAILED");
  const response=await fetch("https://discord.com/api/v10/users/@me",{
   headers:{Authorization:"Bearer "+token.access_token}
  });
  if(!response.ok)throw new PublicError(401,"PUP_DISCORD_PROFILE_FAILED");
  const profile=await response.json();
  const discordId=required(profile.id,/^\d{15,22}$/,"DISCORD_ID_INVALID");
  const offer=await offerDiscordRegistration({
   profile,origin,admin,json,PublicError,key
  });
  if(offer)return offer;
  const account=await accountForDiscord(discordId);
  const authId=await linkedAuthUser(account);
  const {data:user,error:ue}=await admin.auth.admin.getUserById(authId);
  if(ue||!user?.user?.email)throw new PublicError(503,"PUP_WEB_ACCOUNT_SETUP_FAILED");
  const {data:link,error:ge}=await admin.auth.admin.generateLink({
   type:"magiclink",email:user.user.email
  });
  const hashed=link?.properties?.hashed_token;
  if(ge||typeof hashed!=="string"||!hashed)
   throw new PublicError(503,"PUP_WEB_SESSION_UNAVAILABLE");
  return json(200,{token_hash:hashed,otp_type:"magiclink"},origin);
 }catch(e){
  if(!(e instanceof PublicError)){
   console.error("Pup web auth request failed (details withheld from client)");
  }
  return json(e instanceof PublicError||e instanceof CrossPlayError?e.status:503,{
   error:e instanceof PublicError||e instanceof CrossPlayError?e.code:"PUP_WEB_AUTH_UNAVAILABLE"
  },origin);
 }
});
