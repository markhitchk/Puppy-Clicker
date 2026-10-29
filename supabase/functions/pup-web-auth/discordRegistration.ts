import {createHash} from "node:crypto";
import {sanitizeDiscordIdentity,makeDiscordSignupTicket,verifyDiscordSignupTicket} from "./discordSignup.ts";

export async function offerDiscordRegistration({profile,origin,admin,json,PublicError,key}:any){
 let identity;
 try{identity=sanitizeDiscordIdentity(profile);}
 catch{throw new PublicError(401,"PUP_DISCORD_PROFILE_FAILED");}
 const {data:account,error:accountError}=await admin.from("pup_accounts")
  .select("id,player_uuid").eq("discord_user_id",identity.id).maybeSingle();
 if(accountError)throw new PublicError(503,"PUP_ACCOUNT_LOOKUP_FAILED");
 if(account){
  // Authenticated Discord identity may refresh only its matching player record.
  const patch={
   discord_username:identity.username,discord_global_name:identity.globalName,
   discord_avatar_hash:identity.avatarHash
  };
  if(identity.email)patch.discord_email=identity.email;
  const {error:syncError}=await admin.from("pupeye_players").update(patch)
   .eq("id",account.player_uuid);
  if(syncError)throw new PublicError(503,"PUP_DISCORD_PROFILE_SYNC_FAILED");
  return null;
 }
 const {data:player,error:playerError}=await admin.from("pupeye_players")
  .select("id").eq("discord_user_id",identity.id).maybeSingle();
 if(playerError)throw new PublicError(503,"PUP_ACCOUNT_LOOKUP_FAILED");
 if(player)throw new PublicError(409,"PUP_ACCOUNT_LINK_REQUIRED");
 const ticket=makeDiscordSignupTicket(identity,Deno.env.get("PUP_DISCORD_SIGNUP_SECRET")||key);
 return json(200,{registration_required:true,ticket,profile:{
  id:identity.id,username:identity.username,displayName:identity.globalName,
  avatarUrl:identity.avatarHash
   ?"https://cdn.discordapp.com/avatars/"+identity.id+"/"+identity.avatarHash+".png":null,
  email:identity.email
 }},origin);
}

export async function registerDiscordWebAccount({req,body,origin,admin,json,PublicError,key,newBetaKotlinSave}:any){
 if(typeof body.username!=="string"||!/^[A-Za-z0-9_-]{3,20}$/.test(body.username))
  throw new PublicError(400,"PUP_USERNAME_INVALID");
 if(body.termsAccepted!==true||body.privacyAccepted!==true)
  throw new PublicError(400,"PUP_LEGAL_ACCEPTANCE_REQUIRED");
 let profile;
 try{profile=verifyDiscordSignupTicket(body.ticket,Deno.env.get("PUP_DISCORD_SIGNUP_SECRET")||key);}
 catch{throw new PublicError(401,"PUP_DISCORD_SIGNUP_EXPIRED");}
 const {data:account,error:lookupError}=await admin.from("pup_accounts")
  .select("id").eq("discord_user_id",profile.id).maybeSingle();
 if(lookupError)throw new PublicError(503,"PUP_ACCOUNT_LOOKUP_FAILED");
 if(account)throw new PublicError(409,"PUP_DISCORD_ALREADY_LINKED");
 const contactEmail=body.useDiscordEmail===true?profile.email:null;
 if(body.useDiscordEmail===true&&!contactEmail)
  throw new PublicError(400,"PUP_DISCORD_EMAIL_UNAVAILABLE");
 const network=req.headers.get("cf-connecting-ip")||req.headers.get("x-real-ip")||
  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"unknown";
 const ipHash=createHash("sha256").update("pup-web-signup:"+network).digest("hex");
 const {data:allowed,error:budgetError}=await admin.rpc("consume_pup_web_signup_budget",{p_ip_hash:ipHash});
 if(budgetError)throw new PublicError(503,"PUP_SIGNUP_LIMIT_UNAVAILABLE");
 if(allowed!==true)throw new PublicError(429,"PUP_SIGNUP_RATE_LIMIT");
 const internalEmail="pup-web-"+crypto.randomUUID()+"@accounts.puppyclicker.invalid";
 const {data:created,error:createError}=await admin.auth.admin.createUser({
  email:internalEmail,email_confirm:true,app_metadata:{puppy_clicker_web:true}
 });
 if(createError||!created?.user)throw new PublicError(503,"PUP_SIGNUP_UNAVAILABLE");
 const save=newBetaKotlinSave();
 const hash=createHash("sha256").update(JSON.stringify(save)).digest("hex");
 const {error:registrationError}=await admin.rpc("register_pup_web_discord_account",{
  p_auth_user_id:created.user.id,p_username:body.username,p_email:internalEmail,
  p_discord_user_id:profile.id,p_discord_username:profile.username,
  p_discord_global_name:profile.globalName,p_discord_avatar_hash:profile.avatarHash,
  p_discord_email:profile.email,p_contact_email:contactEmail,p_save_data:save,p_payload_hash:hash
 });
 if(registrationError){
  // Only delete the Auth user created in this request.
  await admin.auth.admin.deleteUser(created.user.id).catch(()=>{});
  if(/PUP_DISCORD_ALREADY_LINKED/.test(registrationError.message||""))
   throw new PublicError(409,"PUP_DISCORD_ALREADY_LINKED");
  if(registrationError.code==="23505"||/PUP_USERNAME_TAKEN/.test(registrationError.message||""))
   throw new PublicError(409,"PUP_USERNAME_TAKEN");
  throw new PublicError(503,"PUP_SIGNUP_UNAVAILABLE");
 }
 const {data:link,error:linkError}=await admin.auth.admin.generateLink({
  type:"magiclink",email:internalEmail
 });
 const hashed=link?.properties?.hashed_token;
 if(linkError||typeof hashed!=="string"||!hashed)
  return json(201,{registered:true,signInRequired:true},origin);
 return json(201,{registered:true,token_hash:hashed,otp_type:"magiclink"},origin);
}
