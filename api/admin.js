import {validatePrivacyReview} from "./_lib/privacyReview.js";
import {checkWebPupEye,WebPupEyeError} from './_lib/webPupEye.js';
import {createClient} from "@supabase/supabase-js";
import {
  AdminError, UUID_PATTERN, isStaff, canModifyRole,
  canSanction, validateRestrictionInput, restrictionStanding, safeSearch, filterRegisteredAccountDirectory, noStore
} from "./_lib/adminPolicy.js";

const requireId = (value) => {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) throw new AdminError(400,"INVALID_TARGET");
  return value;
};
const ensure = (result) => {
  if (result.error) throw new AdminError(503,"ADMIN_DATA_UNAVAILABLE");
  return result.data;
};
function dbClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new AdminError(503,"ADMIN_BACKEND_NOT_CONFIGURED");
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
async function authorize(req,db) {
  const auth = String(req.headers.authorization || "");
  if (!/^Bearer\s+[^\s]+$/.test(auth) || auth.length > 5000)
    throw new AdminError(401,"SIGN_IN_REQUIRED");
  const token=auth.replace(/^Bearer\s+/,"");
  const userResult=await db.auth.getUser(token);
  if (userResult.error || !userResult.data?.user) throw new AdminError(401,"SIGN_IN_REQUIRED");
  const uid=userResult.data.user.id;
  const link=ensure(await db.from("pup_web_auth_links")
    .select("account_uuid").eq("auth_user_id",uid).maybeSingle());
  if (!link) throw new AdminError(403,"PUP_ACCOUNT_REQUIRED");
  const account=ensure(await db.from("pup_accounts")
    .select("id,player_uuid,discord_user_id,status").eq("id",link.account_uuid).maybeSingle());
  if (!account || account.status !== "active") throw new AdminError(403,"ACCOUNT_NOT_ACTIVE");
  const player=ensure(await db.from("pupeye_players")
    .select("id,guild_role,status,username").eq("id",account.player_uuid).maybeSingle());
  if (!player || player.status !== "active" || !isStaff(player.guild_role))
    throw new AdminError(403,"STAFF_ACCESS_REQUIRED");
  // Mirror pup-web-auth's global ban check so a sanctioned staff account
  // cannot bypass gameplay bans through the privileged web administration API.
  const predicates=["player_uuid.eq."+account.player_uuid];
  if (account.discord_user_id && /^\d{15,22}$/.test(account.discord_user_id))
    predicates.push("discord_user_id.eq."+account.discord_user_id);
  const targets=ensure(await db.from("pupeye_ban_targets")
    .select("ban_uuid").or(predicates.join(","))) || [];
  const ids=[...new Set(targets.map(t=>t.ban_uuid).filter(Boolean))];
  if (ids.length) {
    const bans=ensure(await db.from("pupeye_global_bans")
      .select("id,expires_at,revoked_at").in("id",ids).eq("status","active")) || [];
    if (bans.some(b=>!b.revoked_at && (!b.expires_at || Date.parse(b.expires_at)>Date.now())))
      throw new AdminError(403,"ACCOUNT_BANNED");
  }
  // Re-read roles from the authoritative database on EVERY request, not a JWT claim.
  return {uid,account,player,role:player.guild_role};
}
async function audit(db, actor, target, action, detail={}) {
  ensure(await db.from("pup_admin_actions").insert({
    actor_player_uuid:actor.player.id,target_player_uuid:target,
    action_code:action,detail:{source:"web_admin",...detail}
  }));
}
async function users(db,query) {
  const q=safeSearch(query);
  // Pup Account membership, not Pupeye installation registration or username,
  // defines what belongs in the Web Account administration directory.
  const accounts=ensure(await db.from("pup_accounts")
    .select("id,player_uuid,discord_user_id,username,display_name,status,contact_email,created_at,updated_at")
    .order("updated_at",{ascending:false}).limit(200)) || [];
  const ids=accounts.map(a=>a.player_uuid).filter(Boolean);
  if (!ids.length) return [];
  const players=ensure(await db.from("pupeye_players")
    .select("id,username,player_id,friend_code,guild_role,status,created_at,updated_at")
    .in("id",ids)) || [];
  const byPlayer=new Map(players.map(p=>[p.id,p]));
  const filtered=filterRegisteredAccountDirectory(accounts,players,q,100);
  // Network telemetry is optional and has a separate migration; its absence
  // must never hide registered Pup Accounts or expose installation identities.
  let network=[];
  const accountIds=filtered.map(a=>a.id);
  if (accountIds.length) {
    const response=await db.from("pup_web_network_checks")
      .select("account_uuid,ip_address,user_agent,checked_at,vpn,proxy,tor,hosting,detection_status")
      .in("account_uuid",accountIds).order("checked_at",{ascending:false}).limit(500);
    if (!response.error) network=response.data || [];
  }
  const latest=new Map();
  for (const n of network) if (!latest.has(n.account_uuid)) latest.set(n.account_uuid,n);
  const targets=ensure(await db.from("pupeye_ban_targets").select("ban_uuid,player_uuid,discord_user_id")
    .in("player_uuid",ids))||[];
  const discordIds=filtered.map(a=>a.discord_user_id).filter(id=>/^\d{15,22}$/.test(id||""));
  if(discordIds.length)targets.push(...ensure(await db.from("pupeye_ban_targets")
    .select("ban_uuid,player_uuid,discord_user_id").in("discord_user_id",discordIds))||[]);
  const banIds=[...new Set(targets.map(t=>t.ban_uuid))];
  const restrictions=banIds.length?ensure(await db.from("pupeye_global_bans")
    .select("id,status,reason_code,public_reason,expires_at,revoked_at,issued_by")
    .in("id",banIds).eq("status","active"))||[]:[];
  const sessions=await db.from("pup_web_sessions")
    .select("account_uuid,ip_address,user_agent,path,started_at,last_seen_at,ended_at")
    .in("account_uuid",accountIds).order("last_seen_at",{ascending:false}).limit(500);
  const latestSession=new Map();
  for(const s of sessions.data||[])if(!latestSession.has(s.account_uuid))latestSession.set(s.account_uuid,s);
  return filtered.map(a=>{
    const p=byPlayer.get(a.player_uuid);
    const n=latest.get(a.id);
    const session=latestSession.get(a.id);
    const ownBanIds=new Set(targets.filter(t=>t.player_uuid===p.id||
      a.discord_user_id&&t.discord_user_id===a.discord_user_id).map(t=>t.ban_uuid));
    const standing=restrictionStanding(restrictions.filter(b=>ownBanIds.has(b.id)));
    const restriction=standing.restriction;
    return {
      id:p.id,username:a.username,displayName:a.display_name || null,
      profileType:"registered",
      playerId:p.player_id,friendCode:p.friend_code,role:p.guild_role || "GUEST",
      status:standing.status!=="active"?standing.status:a.status!=="active"?a.status:p.status,
      restriction:restriction?{id:restriction.id,reason:restriction.public_reason,
        expiresAt:restriction.expires_at,managedHere:String(restriction.issued_by||"").startsWith("web_admin:")}:null,
      accountStatus:a.status,createdAt:a.created_at,updatedAt:a.updated_at,
      contactEmail:a.contact_email || null,
      connection:session?{ip:session.ip_address,userAgent:session.user_agent,path:session.path,
        startedAt:session.started_at,lastSeenAt:session.last_seen_at,
        recentlyActive:!session.ended_at&&Date.parse(session.last_seen_at)>Date.now()-90000}:null,
      network:n ? {ip:n.ip_address,userAgent:n.user_agent,checkedAt:n.checked_at,
        vpn:n.vpn,proxy:n.proxy,tor:n.tor,hosting:n.hosting,status:n.detection_status} : null
    };
  });
}
async function bans(db) {
  const records=ensure(await db.from("pupeye_global_bans")
    .select("id,public_ban_id,kind,status,reason_code,public_reason,expires_at,issued_at,issued_by,revoked_at")
    .order("issued_at",{ascending:false}).limit(100)) || [];
  const banIds=records.map(b=>b.id);
  if (!banIds.length) return [];
  const targets=ensure(await db.from("pupeye_ban_targets")
    .select("ban_uuid,player_uuid,target_type").in("ban_uuid",banIds)) || [];
  const names=await playerNames(db,targets.map(t=>t.player_uuid));
  return records.map(b=>({...b,status:b.status==="active"&&b.expires_at&&Date.parse(b.expires_at)<=Date.now()?"expired":b.status,
    targets:targets.filter(t=>t.ban_uuid===b.id)
    .map(t=>({playerId:t.player_uuid,targetType:t.target_type,name:names.get(t.player_uuid)||"Former account"}))}));
}
async function moderate(db,params){
 const result=await db.rpc('moderate_registered_pup_account',params);
 if(result.error){
  const code=result.error.message;
  const known={STAFF_ACCESS_REQUIRED:403,ACCOUNT_BANNED:403,CANNOT_SANCTION_STAFF:403,
   REGISTERED_PUP_ACCOUNT_REQUIRED:409,MANAGE_FROM_ORIGINAL_SYSTEM:403,BAN_NOT_FOUND:404,
   INVALID_BAN_REASON:400,INVALID_BAN_EXPIRY:400,SUSPENSION_EXPIRY_REQUIRED:400};
  throw new AdminError(known[code]||503,known[code]?code:'ADMIN_DATA_UNAVAILABLE');
 }
 return result.data;
}
async function playerNames(db,ids){
 const selected=[...new Set(ids.filter(Boolean))];
 if(!selected.length)return new Map();
 const rows=ensure(await db.from("pup_accounts").select("player_uuid,username,display_name").in("player_uuid",selected))||[];
 return new Map(rows.map(a=>[a.player_uuid,a.display_name||('@'+a.username)]));
}
export async function action(db,actor,body) {
  const type=body?.action;
  if (type==="staff-info") return {role:actor.role,username:actor.player.username,playerUuid:actor.player.id};
  if (type==="users") {
    const listed=await users(db,body.search);
    return {users:listed};
  }
  if (type==="audit") {
    const rows=ensure(await db.from("pup_admin_actions")
      .select("id,actor_player_uuid,target_player_uuid,action_code,detail,created_at")
      .not("action_code","in","(WEB_USERS_VIEW,WEB_BANS_VIEW,WEB_AUDIT_VIEW)")
      .order("created_at",{ascending:false}).limit(150)) || [];
    const names=await playerNames(db,rows.flatMap(e=>[e.actor_player_uuid,e.target_player_uuid]));
    return {events:rows.map(e=>({...e,actorName:names.get(e.actor_player_uuid),targetName:names.get(e.target_player_uuid)}))};
  }
  if (type==="bans") {
    const listed=await bans(db);
    return {bans:listed};
  }
  if(type==="activity")return await activity(db,body.filter);
  if(type==="pupeye-web"){
    // Staff has already been verified against the authoritative player role.
    // This service-role-only function never grants browser table access.
    const rows=ensure(await db.rpc('pupeye_web_admin_events',{p_limit:80}));
    return {events:rows||[]};
  }
  if (type==="privacy-requests") {
    const rows=ensure(await db.from("pup_privacy_requests")
      .select("id,account_uuid,type,state,request_note,review_note,submitted_at,deadline_at,updated_at")
      .order("submitted_at",{ascending:false}).limit(100)) || [];
    const accounts=rows.length?ensure(await db.from("pup_accounts")
      .select("id,username,display_name").in("id",[...new Set(rows.map(r=>r.account_uuid).filter(Boolean))]))||[]:[];
    const names=new Map(accounts.map(a=>[a.id,a.display_name||('@'+a.username)]));
    return {requests:rows.map(r=>({id:r.id,accountName:names.get(r.account_uuid)||"Deleted account",
      type:r.type,state:r.state,note:r.request_note,reviewNote:r.review_note,
      submittedAt:r.submitted_at,deadlineAt:r.deadline_at,updatedAt:r.updated_at}))};
  }
  if (type==="privacy-review") {
    const id=requireId(body.requestId);

    const row=ensure(await db.from("pup_privacy_requests").select("id,type,state")
      .eq("id",id).maybeSingle());
    if(!row)throw new AdminError(404,"PRIVACY_REQUEST_NOT_FOUND");
    let state,reason;
    try{({state,reason}=validatePrivacyReview(row.type,row.state,body.state,body.reason));}
    catch(error){throw new AdminError(error.message==="PRIVACY_REVIEW_INVALID"?400:409,error.message);}
    await audit(db,actor,null,"PRIVACY_REVIEW_ATTEMPT",{requestId:id,from:row.state,to:state});
    const now=new Date().toISOString();
    const updated=ensure(await db.from("pup_privacy_requests").update({
      state,review_note:reason,updated_at:now,
      closed_at:["completed","denied"].includes(state)?now:null
    }).eq("id",id).eq("state",row.state).select("id").maybeSingle());
    if(!updated)throw new AdminError(409,"PRIVACY_REQUEST_CONFLICT");
    return {reviewed:true};
  }
  if (type==="role-update") {
    const id=requireId(body.targetPlayerId);
    const role=body.role;
    if (!canModifyRole(actor.role,role,actor.player.id,id))
      throw new AdminError(403,"DEVELOPER_ROLE_REQUIRED");
    const target=ensure(await db.from("pupeye_players").select("id,guild_role,status")
      .eq("id",id).maybeSingle());
    if (!target || target.status !== "active") throw new AdminError(409,"TARGET_NOT_ACTIVE");
    // Staff roles belong to verified Pup Accounts, not orphaned local player rows.
    const linked=ensure(await db.from("pup_accounts")
      .select("id").eq("player_uuid",id).maybeSingle());
    if (!linked) throw new AdminError(409,"REGISTERED_PUP_ACCOUNT_REQUIRED");
    if (target.guild_role === role) return {updated:true,unchanged:true};
    // Developer demotion requires a dedicated privileged, transactional
    // owner workflow. Never risk demoting the final developer via web requests.
    if (target.guild_role==="DEVELOPER" && role!=="DEVELOPER")
      throw new AdminError(403,"DEVELOPER_ROLE_PROTECTED");
    // Conditional write to reject concurrent changes.
    let update=db.from("pupeye_players").update({guild_role:role,updated_at:new Date().toISOString()})
      .eq("id",id);
    update=target.guild_role==null?update.is("guild_role",null):update.eq("guild_role",target.guild_role);
    const saved=ensure(await update.select("id").maybeSingle());
    if (!saved) throw new AdminError(409,"ROLE_CHANGED_CONCURRENTLY");
    await audit(db,actor,id,"WEB_ROLE_CHANGED",{before:target.guild_role,after:role});
    return {updated:true};
  }
  if (type==="ban-account"||type==="suspend-account") {
    const id=requireId(body.targetPlayerId);
    const {reason,expiresAt}=validateRestrictionInput(body);
    const target=ensure(await db.from("pupeye_players").select("id,guild_role,status").eq("id",id).maybeSingle());
    if (!target) throw new AdminError(404,"TARGET_NOT_FOUND");
    const registered=ensure(await db.from("pup_accounts")
      .select("id").eq("player_uuid",id).maybeSingle());
    if (!registered) throw new AdminError(409,"REGISTERED_PUP_ACCOUNT_REQUIRED");
    if (!canSanction(actor.role,target.guild_role,actor.player.id,id))
      throw new AdminError(403,"CANNOT_SANCTION_STAFF");
    // Global ban records are used by PupEye / Android and pup-web-auth.
    await moderate(db,{p_actor_player_uuid:actor.player.id,p_target_player_uuid:id,p_action:type,
      p_reason:reason,p_expires_at:expiresAt,p_ban_uuid:null});
    return {created:true};
  }
  if (type==="unban-account") {
    const id=requireId(body.banId);
    const ban=ensure(await db.from("pupeye_global_bans")
      .select("id,issued_by,status").eq("id",id).maybeSingle());
    if (!ban) throw new AdminError(404,"BAN_NOT_FOUND");
    if (!String(ban.issued_by||"").startsWith("web_admin:"))
      throw new AdminError(403,"MANAGE_FROM_ORIGINAL_SYSTEM");
    if (ban.status !== "active") return {revoked:true,unchanged:true};
    const targets=ensure(await db.from("pupeye_ban_targets")
      .select("player_uuid").eq("ban_uuid",id));
    const targetIds=[...new Set((targets||[]).map(t=>t.player_uuid).filter(Boolean))];
    if (actor.role!=="DEVELOPER") {
      const staff=targetIds.length ? ensure(await db.from("pupeye_players")
        .select("id,guild_role").in("id",targetIds)) : [];
      if ((staff||[]).some(t=>isStaff(t.guild_role)))
        throw new AdminError(403,"CANNOT_UNBAN_STAFF");
    }
    await moderate(db,{p_actor_player_uuid:actor.player.id,p_target_player_uuid:null,p_action:type,
      p_reason:null,p_expires_at:null,p_ban_uuid:id});
    return {revoked:true};
  }
  throw new AdminError(400,"INVALID_ADMIN_ACTION");
}
async function activity(db,filter){
 const day=new Date(Date.now()-86400000).toISOString();
 const online=new Date(Date.now()-90000).toISOString();
 let eventsQuery=db.from("pup_web_activity_events").select(
  "id,account_uuid,event_code,source,outcome,provider,error_code,login_hint,path,ip_address,user_agent,created_at"
 ).gte("created_at",day).order("created_at",{ascending:false}).limit(200);
 if(filter==="errors")eventsQuery=eventsQuery.eq("outcome","failure");
 if(filter==="auth")eventsQuery=eventsQuery.in("event_code",["login_success","login_failed","register_success","register_failed","discord_authorized","discord_registration_required","auth_error"]);
 if(filter==="connections")eventsQuery=eventsQuery.in("event_code",["page_view","session_end","logout"]);
 const results=await Promise.all([
  db.from("pup_web_sessions").select("id,account_uuid,ip_address,user_agent,path,started_at,last_seen_at,ended_at")
   .gte("last_seen_at",day).order("last_seen_at",{ascending:false}).limit(150),
  eventsQuery,
  db.from("pup_web_sessions").select("id",{count:"exact",head:true}).gte("last_seen_at",online).is("ended_at",null),
  db.from("pup_web_sessions").select("account_uuid").gte("last_seen_at",online).is("ended_at",null).not("account_uuid","is",null),
  db.from("pup_web_activity_events").select("id",{count:"exact",head:true}).gte("created_at",day).eq("outcome","failure"),
  db.from("pup_accounts").select("id,username,display_name"),
  db.from("pup_account_devices").select("id,account_uuid,installation_uuid,last_seen_at").order("last_seen_at",{ascending:false}).limit(100)
 ]);
 results.forEach(ensure);
 const [sessions,events,,, ,accounts,devices]=results.map(r=>r.data||[]);
 const names=new Map(accounts.map(a=>[a.id,a.display_name||('@'+a.username)]));
 const installationIds=devices.map(d=>d.installation_uuid).filter(Boolean);
 const installations=installationIds.length?ensure(await db.from("pupeye_installations")
  .select("id,device_model,platform,app_version,active,last_seen_at,revoked_at")
  .in("id",installationIds))||[]:[];
 const byInstallation=new Map(installations.map(i=>[i.id,i]));
 return {sessions:sessions.map(s=>({...s,accountName:names.get(s.account_uuid)||null})),
  events:events.map(e=>({...e,accountName:names.get(e.account_uuid)||null})),
  androidDevices:devices.filter(d=>names.has(d.account_uuid)&&byInstallation.has(d.installation_uuid))
   .map(d=>({...byInstallation.get(d.installation_uuid),accountName:names.get(d.account_uuid),linkedLastSeen:d.last_seen_at})),
  summary:{onlineSessions:results[2].count||0,
   onlineAccounts:new Set((results[3].data||[]).map(s=>s.account_uuid)).size,
   errors24h:results[4].count||0},generatedAt:new Date().toISOString()};
}
export default async function handler(req,res) {
  noStore(res);
  if(req.method!=="POST") {res.setHeader("Allow","POST");return res.status(405).json({error:"METHOD_NOT_ALLOWED"});}
  const origin=req.headers.origin;
  if (origin) {
    try {
      if (new URL(origin).host !== req.headers.host || new URL(origin).protocol!=="https:" && process.env.VERCEL==="1")
        throw new AdminError(403,"ORIGIN_NOT_ALLOWED");
    } catch {return res.status(403).json({error:"ORIGIN_NOT_ALLOWED"});}
  }
  const length=Number(req.headers["content-length"] || 0);
  if (length>8192) return res.status(413).json({error:"REQUEST_TOO_LARGE"});
  try {
    const db=dbClient();
    const actor=await authorize(req,db);
    // PupEye Web protects privileged actions with the same account identity.
    await checkWebPupEye(db,actor.account.id,'admin',req.headers,{vercel:process.env.VERCEL==='1'});
    const result=await action(db,actor,req.body || {});
    return res.status(200).json({ok:true,...result});
  } catch(e) {
    const known=e instanceof AdminError||e instanceof WebPupEyeError;
    const status=known?e.status:503;
    if(!known)console.error("Web admin request error; details withheld");
    return res.status(status).json({error:known?e.code:"ADMIN_UNAVAILABLE"});
  }
}
