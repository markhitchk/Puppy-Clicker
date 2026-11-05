// Optional discovery data. It does not prove account ownership or grant referral credits.
const SOURCES=new Set(["friend","discord","youtube","tiktok","instagram","reddit","google","play_store","other"]);
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
export async function recordJoinSource(admin:any,authUserId:string,answer:{source:string|null,details:string|null}){
 if(!answer.source)return;
 try{
  const {data:link,error:lookupError}=await admin.from("pup_web_auth_links")
   .select("account_uuid").eq("auth_user_id",authUserId).maybeSingle();
  if(lookupError||!link?.account_uuid)throw Error("lookup");
  const {error}=await admin.from("pup_registration_sources").insert({
   account_uuid:link.account_uuid,source:answer.source,details:answer.details
  });
  if(error)throw Error("insert");
 }catch{
  // Optional analytics cannot invalidate a newly created player account.
  console.error("Pup registration discovery feedback could not be saved");
 }
}
