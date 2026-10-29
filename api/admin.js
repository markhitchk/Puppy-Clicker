import {randomUUID} from "node:crypto";
import {createClient} from "@supabase/supabase-js";
import {
  AdminError, UUID_PATTERN, isStaff, canModifyRole,
  canSanction, validateBanInput, safeSearch, noStore
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
  const players=ensure(await db.from("pupeye_players")
    .select("id,username,player_id,friend_code,guild_role,status,created_at,updated_at")
    .order("updated_at",{ascending:false}).limit(200)) || [];
  const filtered=players.filter(p=>!q || [p.username,p.player_id,p.friend_code].some(v=>
    typeof v==="string" && v.toLowerCase().includes(q))).slice(0,100);
  const ids=filtered.map(p=>p.id);
  if (!ids.length) return [];
  const accounts=ensure(await db.from("pup_accounts")
    .select("id,player_uuid,username,display_name,status,contact_email")
    .in("player_uuid",ids)) || [];
  const byPlayer=new Map(accounts.map(a=>[a.player_uuid,a]));
  // Network telemetry schema is staged separately; missing table must not break panel.
  let network=[];
  const accountIds=accounts.map(a=>a.id);
  if (accountIds.length) {
    const response=await db.from("pup_web_network_checks")
      .select("account_uuid,ip_address,user_agent,checked_at,vpn,proxy,tor,hosting,detection_status")
      .in("account_uuid",accountIds).order("checked_at",{ascending:false}).limit(500);
    if (!response.error) network=response.data || [];
  }
  const latest=new Map();
  for (const n of network) if (!latest.has(n.account_uuid)) latest.set(n.account_uuid,n);
  return filtered.map(p=>{
    const a=byPlayer.get(p.id);
    const n=a&&latest.get(a.id);
    return {
      id:p.id,username:a?.username || p.username || "", displayName:a?.display_name || null,
      playerId:p.player_id,friendCode:p.friend_code,role:p.guild_role || "GUEST",
      status:a?.status === "blocked" || p.status === "blocked" ? "blocked" : p.status,
      accountStatus:a?.status || null,createdAt:p.created_at,updatedAt:p.updated_at,
      contactEmail:a?.contact_email || null,
      network:n ? {ip:n.ip_address,userAgent:n.user_agent,checkedAt:n.checked_at,
        vpn:n.vpn,proxy:n.proxy,tor:n.tor,hosting:n.hosting,status:n.detection_status} : null
    };
  });
}
async function bans(db) {
  const records=ensure(await db.from("pupeye_global_bans")
    .select("id,public_ban_id,kind,status,public_reason,expires_at,issued_at,issued_by,revoked_at")
    .order("issued_at",{ascending:false}).limit(100)) || [];
  const banIds=records.map(b=>b.id);
  if (!banIds.length) return [];
  const targets=ensure(await db.from("pupeye_ban_targets")
    .select("ban_uuid,player_uuid,target_type").in("ban_uuid",banIds)) || [];
  return records.map(b=>({...b,targets:targets.filter(t=>t.ban_uuid===b.id)
    .map(t=>({playerId:t.player_uuid,targetType:t.target_type}))}));
}
async function action(db,actor,body) {
  const type=body?.action;
  if (type==="staff-info") return {role:actor.role,username:actor.player.username};
  if (type==="users") return {users:await users(db,body.search)};
  if (type==="audit") {
    const rows=ensure(await db.from("pup_admin_actions")
      .select("id,actor_player_uuid,target_player_uuid,action_code,detail,created_at")
      .order("created_at",{ascending:false}).limit(150)) || [];
    return {events:rows};
  }
  if (type==="bans") return {bans:await bans(db)};
  if (type==="role-update") {
    const id=requireId(body.targetPlayerId);
    const role=body.role;
    if (!canModifyRole(actor.role,role,actor.player.id,id))
      throw new AdminError(403,"DEVELOPER_ROLE_REQUIRED");
    const target=ensure(await db.from("pupeye_players").select("id,guild_role,status")
      .eq("id",id).maybeSingle());
    if (!target || target.status !== "active") throw new AdminError(409,"TARGET_NOT_ACTIVE");
    if (target.guild_role === role) return {updated:true,unchanged:true};
    if (target.guild_role==="DEVELOPER") {
      const developers=ensure(await db.from("pupeye_players")
        .select("id").eq("guild_role","DEVELOPER").eq("status","active").limit(2));
      if ((developers||[]).length < 2) throw new AdminError(409,"LAST_DEVELOPER_PROTECTED");
    }
    // Conditional write to reject concurrent changes.
    let update=db.from("pupeye_players").update({guild_role:role,updated_at:new Date().toISOString()})
      .eq("id",id);
    update=target.guild_role==null?update.is("guild_role",null):update.eq("guild_role",target.guild_role);
    const saved=ensure(await update.select("id").maybeSingle());
    if (!saved) throw new AdminError(409,"ROLE_CHANGED_CONCURRENTLY");
    await audit(db,actor,id,"WEB_ROLE_CHANGED",{before:target.guild_role,after:role});
    return {updated:true};
  }
  if (type==="ban-account") {
    const id=requireId(body.targetPlayerId);
    const {reason,expiresAt}=validateBanInput(body);
    const target=ensure(await db.from("pupeye_players").select("id,guild_role,status").eq("id",id).maybeSingle());
    if (!target) throw new AdminError(404,"TARGET_NOT_FOUND");
    if (!canSanction(actor.role,target.guild_role,actor.player.id,id))
      throw new AdminError(403,"CANNOT_SANCTION_STAFF");
    // Global ban records are used by PupEye / Android and pup-web-auth.
    const ban=ensure(await db.from("pupeye_global_bans").insert({
      public_ban_id:"PWEB-"+randomUUID().slice(0,12).toUpperCase(),
      kind:expiresAt?"temporary":"permanent",status:"active",
      reason_code:"WEB_ADMIN",public_reason:reason,internal_reason:"Issued through protected web admin",
      issued_by:"web_admin:"+actor.player.id,expires_at:expiresAt
    }).select("id").single());
    try {
      ensure(await db.from("pupeye_ban_targets").insert({
        ban_uuid:ban.id,target_type:"PLAYER",player_uuid:id,
        attached_by:"web_admin:"+actor.player.id
      }));
    } catch(error) {
      await db.from("pupeye_global_bans").update({status:"revoked",revoked_at:new Date().toISOString(),
        revoked_by:"web_admin_rollback"}).eq("id",ban.id);
      throw error;
    }
    await audit(db,actor,id,"WEB_BAN_CREATED",{banId:ban.id,reason,expiresAt});
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
    const saved=ensure(await db.from("pupeye_global_bans")
      .update({status:"revoked",revoked_at:new Date().toISOString(),
        revoked_by:"web_admin:"+actor.player.id,updated_at:new Date().toISOString()})
      .eq("id",id).eq("status","active").select("id").maybeSingle());
    if (!saved) throw new AdminError(409,"BAN_UPDATED_CONCURRENTLY");
    await audit(db,actor,targetIds[0]||null,"WEB_BAN_REVOKED",{banId:id});
    return {revoked:true};
  }
  throw new AdminError(400,"INVALID_ADMIN_ACTION");
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
    const result=await action(db,actor,req.body || {});
    return res.status(200).json({ok:true,...result});
  } catch(e) {
    const status=e instanceof AdminError?e.status:503;
    if(!(e instanceof AdminError)) console.error("Web admin request error; details withheld");
    return res.status(status).json({error:e instanceof AdminError?e.code:"ADMIN_UNAVAILABLE"});
  }
}
