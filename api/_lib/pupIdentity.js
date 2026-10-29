import {createClient} from "@supabase/supabase-js";

export class PupError extends Error {
 constructor(status,code){super(code);this.status=status;this.code=code;}
}
export function dbClient(){
 const url=process.env.SUPABASE_URL;
 const key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw new PupError(503,"PUP_BACKEND_NOT_CONFIGURED");
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
export function ensure(value){
 if(value.error)throw new PupError(503,"PUP_DATA_UNAVAILABLE");
 return value.data;
}
export function validateRequest(req,res){
 res.setHeader("Cache-Control","private, no-store, max-age=0");
 if(req.method!=="POST")throw new PupError(405,"METHOD_NOT_ALLOWED");
 const origin=req.headers.origin;
 if(origin){
  try {
   const parsed=new URL(origin);
   if(parsed.host!==req.headers.host ||
    (process.env.VERCEL==="1"&&parsed.protocol!=="https:"))throw Error("bad origin");
  }catch{throw new PupError(403,"ORIGIN_NOT_ALLOWED");}
 }
 if(Number(req.headers["content-length"]||0)>8192)throw new PupError(413,"REQUEST_TOO_LARGE");
}
export async function getPupIdentity(req,db){
 const auth=String(req.headers.authorization||"");
 if(!/^Bearer\s+[^\s]+$/.test(auth)||auth.length>5000)throw new PupError(401,"SIGN_IN_REQUIRED");
 const user=await db.auth.getUser(auth.replace(/^Bearer\s+/,""));
 if(user.error||!user.data?.user)throw new PupError(401,"SIGN_IN_REQUIRED");
 const uid=user.data.user.id;
 const link=ensure(await db.from("pup_web_auth_links")
  .select("account_uuid").eq("auth_user_id",uid).maybeSingle());
 if(!link)throw new PupError(403,"PUP_ACCOUNT_REQUIRED");
 const account=ensure(await db.from("pup_accounts")
  .select("id,player_uuid,username,status,profile_avatar_path,updated_at,discord_user_id")
  .eq("id",link.account_uuid).maybeSingle());
 if(!account||account.status!=="active")throw new PupError(403,"ACCOUNT_NOT_ACTIVE");
 const player=ensure(await db.from("pupeye_players")
  .select("id,guild_role,status").eq("id",account.player_uuid).maybeSingle());
 if(!player||player.status!=="active")throw new PupError(403,"ACCOUNT_NOT_ACTIVE");
 // Player or Discord bans also block staff actions and gifts.
 const predicates=["player_uuid.eq."+player.id];
 if(account.discord_user_id&&/^\\d{15,22}$/.test(account.discord_user_id))
  predicates.push("discord_user_id.eq."+account.discord_user_id);
 const bans=ensure(await db.from("pupeye_ban_targets")
  .select("ban_uuid").or(predicates.join(",")))||[];
 if(bans.length){
  const active=ensure(await db.from("pupeye_global_bans")
   .select("id,revoked_at,expires_at").in("id",[...new Set(bans.map(x=>x.ban_uuid))])
   .eq("status","active"))||[];
  if(active.some(x=>!x.revoked_at&&(!x.expires_at||Date.parse(x.expires_at)>Date.now())))
   throw new PupError(403,"ACCOUNT_BANNED");
 }
 return {uid,account,player,role:player.guild_role};
}
export function isStaff(actor){return ["ADMIN","DEVELOPER"].includes(actor.role);}
export function fail(res,error){
 if(!(error instanceof PupError))console.error("Pup website API request failed; details withheld");
 return res.status(error instanceof PupError?error.status:503)
  .json({ok:false,error:error instanceof PupError?error.code:"PUP_SERVICE_UNAVAILABLE"});
}
export function canonicalJson(value){
 if(value==null)return "null";
 if(Array.isArray(value))return "["+value.map(canonicalJson).join(",")+"]";
 if(typeof value==="object")return "{"+Object.keys(value).sort()
  .map(key=>JSON.stringify(key)+":"+canonicalJson(value[key])).join(",")+"}";
 return JSON.stringify(value);
}
