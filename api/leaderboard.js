import {createClient} from "@supabase/supabase-js";
import {LEADERBOARD_METRICS,scoreFromVerifiedSave,publicLeaderboard} from "./_lib/leaderboardCore.js";
import {isLeaderboardActionAllowed,leaderboardParticipation} from "./_lib/leaderboardAccess.js";
class Failure extends Error{constructor(status,code){super(code);this.status=status;}}
const validId=id=>typeof id==="string"&&/^[\da-f]{8}-[\da-f]{4}-[1-8][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(id);
function need(data){if(data.error)throw new Failure(503,"LEADERBOARD_UNAVAILABLE");return data.data;}
function database(){
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw new Failure(503,"LEADERBOARD_UNAVAILABLE");
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
async function ineligibilityReason(db,account){
 if(account.status!=="active")return "account";
 const p=need(await db.from("pupeye_players").select("id,guild_role,status").eq("id",account.player_uuid).maybeSingle());
 if(!p||p.status!=="active")return "player";
 const predicates=["player_uuid.eq."+account.player_uuid];
 if(/^\d{15,22}$/.test(account.discord_user_id||""))predicates.push("discord_user_id.eq."+account.discord_user_id);
 const targets=need(await db.from("pupeye_ban_targets").select("ban_uuid").or(predicates.join(",")))||[];
 const ids=[...new Set(targets.map(t=>t.ban_uuid).filter(validId))];
 if(ids.length){
  const bans=need(await db.from("pupeye_global_bans").select("id,status,expires_at,revoked_at").in("id",ids).eq("status","active"))||[];
  if(bans.some(b=>!b.revoked_at&&(!b.expires_at||Date.parse(b.expires_at)>Date.now())))return "banned";
 }
 return p.guild_role==="DEVELOPER"?"developer":null;
}
async function current(db,req){
 const bearer=String(req.headers?.authorization||"");
 if(!/^Bearer\s+[^\s]+$/.test(bearer)||bearer.length>5000)throw new Failure(401,"SIGN_IN_REQUIRED");
 const auth=await db.auth.getUser(bearer.replace(/^Bearer\s+/,""));
 if(auth.error||!auth.data?.user)throw new Failure(401,"SIGN_IN_REQUIRED");
 const link=need(await db.from("pup_web_auth_links").select("account_uuid").eq("auth_user_id",auth.data.user.id).maybeSingle());
 if(!link||!validId(link.account_uuid))throw new Failure(403,"PUP_ACCOUNT_REQUIRED");
 const account=need(await db.from("pup_accounts").select("id,player_uuid,discord_user_id,status").eq("id",link.account_uuid).maybeSingle());
 if(!account||!validId(account.player_uuid)||account.status!=="active")throw new Failure(403,"ACCOUNT_NOT_ACTIVE");
 const reason=await ineligibilityReason(db,account);
 if(!isLeaderboardActionAllowed({reason,method:req.method}))throw new Failure(403,"ACCOUNT_INELIGIBLE");
 return {...account,leaderboardReason:reason};
}
async function list(db,account,metric){
 if(!LEADERBOARD_METRICS.includes(metric))throw new Failure(400,"INVALID_METRIC");
 const rows=need(await db.from("pup_leaderboard_participants")
  .select("account_uuid,opted_in,excluded").eq("opted_in",true).eq("excluded",false).limit(5000))||[];
 const ids=rows.map(r=>r.account_uuid).filter(validId);
 const mine=need(await db.from("pup_leaderboard_participants")
   .select("opted_in,excluded").eq("account_uuid",account.id).maybeSingle());
 const participation=leaderboardParticipation({reason:account.leaderboardReason,optedIn:mine?.opted_in,excluded:mine?.excluded});
 if(!ids.length)return {metric,...participation,top:[],self:null,total:0};
 const accounts=need(await db.from("pup_accounts")
  .select("id,player_uuid,discord_user_id,username,display_name,status").in("id",ids))||[];
 const players=need(await db.from("pupeye_players")
  .select("id,guild_role,status").in("id",accounts.map(a=>a.player_uuid)))||[];
 const pmap=new Map(players.map(p=>[p.id,p]));
 const saveRows=need(await db.from("pup_account_saves")
  .select("account_uuid,save_schema,revision,save_data").in("account_uuid",ids))||[];
 const saves=new Map(saveRows.map(s=>[s.account_uuid,s]));
 const targets=need(await db.from("pupeye_ban_targets")
  .select("ban_uuid,player_uuid").in("player_uuid",accounts.map(a=>a.player_uuid)))||[];
 const bansIds=[...new Set(targets.map(t=>t.ban_uuid).filter(validId))];
 const bans=bansIds.length?need(await db.from("pupeye_global_bans")
  .select("id,status,expires_at,revoked_at").in("id",bansIds).eq("status","active"))||[]:[];
 const activeBans=new Set(bans.filter(b=>!b.revoked_at&&(!b.expires_at||Date.parse(b.expires_at)>Date.now())).map(b=>b.id));
 const excludedPlayers=new Set(targets.filter(t=>activeBans.has(t.ban_uuid)).map(t=>t.player_uuid));
 const eligible=accounts.filter(a=>a.status==="active"&&pmap.get(a.player_uuid)?.status==="active"&&pmap.get(a.player_uuid)?.guild_role!=="DEVELOPER"&&!excludedPlayers.has(a.player_uuid))
  .map(a=>({key:a.id,username:a.username,displayName:a.display_name||a.username,score:scoreFromVerifiedSave(saves.get(a.id),metric)}))
  .filter(a=>a.score!==null&&typeof a.username==="string");
 return {metric,...participation,...publicLeaderboard(eligible,account.id,100)};
}
async function change(db,account,join){
 const relation=db.from("pup_leaderboard_participants");
 const prior=need(await relation.select("account_uuid,excluded").eq("account_uuid",account.id).maybeSingle());
 if(prior?.excluded)throw new Failure(403,"ACCOUNT_INELIGIBLE");
 const when=new Date().toISOString();
 if(prior){
  need(await relation.update({opted_in:join,updated_at:when,...(join?{joined_at:when}:{})}).eq("account_uuid",account.id));
 }else{
  const insert=await relation.insert({account_uuid:account.id,opted_in:join,joined_at:join?when:null});
  if(insert.error){
   // Concurrent first-time requests must not alter staff-owned exclusion state.
   if(insert.error.code!=="23505")throw new Failure(503,"LEADERBOARD_UNAVAILABLE");
   const current=need(await relation.select("excluded").eq("account_uuid",account.id).maybeSingle());
   if(current?.excluded)throw new Failure(403,"ACCOUNT_INELIGIBLE");
   need(await relation.update({opted_in:join,updated_at:when}).eq("account_uuid",account.id));
  }
 }
 return {participating:join};
}
export default async function handler(req,res){
 res.setHeader("Cache-Control","private, no-store, max-age=0");
 res.setHeader("Content-Type","application/json; charset=utf-8");
 res.setHeader("X-Content-Type-Options","nosniff");
 try{
  if(!["GET","POST"].includes(req.method)){res.setHeader("Allow","GET, POST");throw new Failure(405,"METHOD_NOT_ALLOWED");}
  const db=database(),account=await current(db,req);
  if(req.method==="POST"){
   const type=req.body?.action;
   if(type!=="join"&&type!=="leave")throw new Failure(400,"INVALID_ACTION");
   return res.status(200).json({ok:true,...await change(db,account,type==="join")});
  }
  const metric=typeof req.query?.metric==="string"?req.query.metric:"treats";
  return res.status(200).json({ok:true,...await list(db,account,metric)});
 }catch(error){return res.status(error.status||503).json({ok:false,error:error instanceof Failure?error.message:"LEADERBOARD_UNAVAILABLE"});}
}
