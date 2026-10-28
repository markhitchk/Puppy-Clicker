import {createClient} from "npm:@supabase/supabase-js@2.117.1";

// This is Puppy Clicker's own public OAuth2 application (same client ID as
// the Android DiscordSignupAuth). Do not use shared Supabase Discord OAuth.
export const PUPPY_DISCORD_CLIENT_ID = "1547982688898777118";
export const PUPPY_WEB_REDIRECT_URI =
  "https://puppy-clicker.vercel.app/auth/discord/callback";
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

async function accountAllowed(account){
 if(!account||account.status!=="active")throw new PublicError(403,"PUP_ACCOUNT_NOT_AVAILABLE");
 if(Number(account.terms_version)<1||Number(account.privacy_version)<1
   ||!account.terms_accepted_at||!account.privacy_accepted_at)
  throw new PublicError(403,"PUP_ACCOUNT_LEGAL_REQUIRED");
 // Global player/Discord bans are shared with Android; browser sessions cannot
 // be a backdoor after an account or Discord ban.
 const playerId=required(account.player_uuid,/^[0-9a-f-]{36}$/i,"PUP_ID_INVALID");
 const predicates=["player_uuid.eq."+playerId];
 if(account.discord_user_id)predicates.push("discord_user_id.eq."+
  required(account.discord_user_id,/^\d{15,22}$/,"DISCORD_ID_INVALID"));
 const {data:targets,error:te}=await admin.from("pupeye_ban_targets")
  .select("ban_uuid").or(predicates.join(","));
 if(te)throw new PublicError(503,"PUP_ENFORCEMENT_UNAVAILABLE");
 const ids=[...new Set((targets||[]).map(t=>t.ban_uuid).filter(Boolean))];
 if(ids.length){
  const {data:bans,error:be}=await admin.from("pupeye_global_bans")
    .select("id,status,expires_at,revoked_at").in("id",ids).eq("status","active");
  if(be)throw new PublicError(503,"PUP_ENFORCEMENT_UNAVAILABLE");
  if((bans||[]).some(b=>!b.revoked_at&&(!b.expires_at||Date.parse(b.expires_at)>Date.now())))
   throw new PublicError(403,"PUP_ACCOUNT_BLOCKED");
 }
}
async function accountForDiscord(discordId){
 const {data,error}=await admin.from("pup_accounts").select(
   "id,player_uuid,discord_user_id,username,display_name,status,terms_version,privacy_version,terms_accepted_at,privacy_accepted_at"
 ).eq("discord_user_id",discordId).maybeSingle();
 if(error)throw new PublicError(503,"PUP_ACCOUNT_LOOKUP_FAILED");
 if(!data)throw new PublicError(403,"PUP_ACCOUNT_LINK_REQUIRED");
 await accountAllowed(data);
 return data;
}
async function accountForCredentials(login){
 const {data,error}=await admin.from("pup_accounts").select(
  "id,player_uuid,discord_user_id,username,display_name,status,terms_version,privacy_version,terms_accepted_at,privacy_accepted_at"
 ).ilike("username",login).maybeSingle();
 if(error)throw new PublicError(503,"PUP_ACCOUNT_LOOKUP_FAILED");
 if(!data)throw new PublicError(401,"PUP_SIGNIN_INVALID");
 await accountAllowed(data);
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
async function currentSession(req){
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
  "id,player_uuid,discord_user_id,username,display_name,status,terms_version,privacy_version,terms_accepted_at,privacy_accepted_at"
 ).eq("id",link.account_uuid).maybeSingle();
 if(ae)throw new PublicError(503,"PUP_ACCOUNT_LOOKUP_FAILED");
 await accountAllowed(account);
 return {account,user:data.user};
}
Deno.serve(async req=>{
 const origin=req.headers.get("origin")||"";
 if(req.method==="OPTIONS")return json(204,{},origin);
 if(req.method!=="POST")return json(405,{error:"METHOD_NOT_ALLOWED"},origin);
 if(!SAFE_ORIGINS.has(origin))return json(403,{error:"ORIGIN_NOT_ALLOWED"},origin);
 try{
  const body=await req.json();
  if(!body||typeof body!=="object")throw new PublicError(400,"PUP_REQUEST_INVALID");
  if(body.action==="status"){
   const {account}=await currentSession(req);
   return json(200,{verified:true,account:{
    id:account.id,username:account.username,
    displayName:account.display_name||account.username,
    discordUserId:account.discord_user_id||null
   }},origin);
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
  required(body.redirectUri,/^https:\/\/puppy-clicker\.vercel\.app\/auth\/discord\/callback$/,
    "DISCORD_REDIRECT_INVALID");
  const code=required(body.code,/^[\w-]{8,2048}$/,"DISCORD_CODE_INVALID");
  const verifier=required(body.verifier,/^[A-Za-z0-9_.~-]{43,128}$/,"DISCORD_PKCE_INVALID");
  const form=new URLSearchParams({
   client_id:PUPPY_DISCORD_CLIENT_ID,grant_type:"authorization_code",
   code,redirect_uri:PUPPY_WEB_REDIRECT_URI,code_verifier:verifier
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
  return json(e instanceof PublicError?e.status:503,{
   error:e instanceof PublicError?e.code:"PUP_WEB_AUTH_UNAVAILABLE"
  },origin);
 }
});
