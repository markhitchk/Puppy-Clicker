// Optional discovery data. It does not prove account ownership or grant referral credits.
const SOURCES=new Set(["friend","discord","youtube","tiktok","instagram","reddit","google","play_store","other","snapchat","facebook","x","twitch"]);
export function parseJoinSource(body:any,PublicError:any){
 const raw=body?.joinSource;
 const details=body?.joinDetails==null?"":typeof body.joinDetails==="string"?body.joinDetails.trim():null;
 if(details===null||details.length>120||/[\x00-\x1f\x7f]/.test(details))
  throw new PublicError(400,"PUP_JOIN_SOURCE_INVALID");
 if(raw==null||raw===""){
  if(details)throw new PublicError(400,"PUP_JOIN_SOURCE_INVALID");
  return {source:null,details:null};
 }
 if(typeof raw!=="string"||!SOURCES.has(raw))
  throw new PublicError(400,"PUP_JOIN_SOURCE_INVALID");
 return {source:raw,details:details||null};
}
export async function recordJoinSource(admin:any,authUserId:string,answer:{source:string|null,details:string|null},method?:"password"|"discord",inviteCode?:unknown){
 if(!answer.source&&!method)return;
 try{
  const {data:link,error:lookupError}=await admin.from("pup_web_auth_links")
   .select("account_uuid").eq("auth_user_id",authUserId).maybeSingle();
  if(lookupError||!link?.account_uuid)throw Error("lookup");
  let inviterAccountId:string|null=null;
  const code=typeof inviteCode==="string"?inviteCode.trim().toUpperCase():"";
  if(/^(?:PUP-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}|PUP-HARLEYTG-DEV)$/.test(code)){
   const {data:inviterPlayer}=await admin.from("pupeye_players").select("id").eq("friend_code",code).eq("status","active").maybeSingle();
   if(inviterPlayer?.id){
    const {data:inviter}=await admin.from("pup_accounts").select("id").eq("player_uuid",inviterPlayer.id).eq("status","active").maybeSingle();
    if(inviter?.id&&inviter.id!==link.account_uuid)inviterAccountId=inviter.id;
   }
  }
  // Only a server-verified, active, non-self inviter overrides the manual answer.
  const base={account_uuid:link.account_uuid,source:inviterAccountId?"friend":answer.source,details:inviterAccountId?null:answer.details};
  const {error}=await admin.from("pup_registration_sources").insert(method?{...base,registration_method:method,inviter_account_uuid:inviterAccountId}:base);
  if(error){
   if(method&&answer.source&&["PGRST204","42703"].includes(error.code)){
    // A legacy schema cannot retain the verified inviter; do not falsely attribute it.
    const legacy=await admin.from("pup_registration_sources").insert({account_uuid:link.account_uuid,source:answer.source,details:answer.details});
    if(legacy.error)throw Error("legacy insert");
   }else throw Error("insert");
  }
 }catch{
  // Optional analytics cannot invalidate a newly created player account.
  console.error("Pup registration discovery feedback could not be saved");
 }
}
