import {createClient} from "@supabase/supabase-js";
import {normalizedChatBody,screenPupEyeChat} from "./_lib/chatScreening.js";
// Requires private social migration + reviewed retention schedule and privacy disclosures.
// Deliberately OFF by default, including direct API access.
const CHAT_ENABLED=process.env.PUPPY_SOCIAL_ENABLED==="true";
const UUID=/^[\da-f]{8}-[\da-f]{4}-[1-8][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i;
const isId=value=>typeof value==="string"&&UUID.test(value);
const allowedCodes=new Set(["CHAT_INVALID_INPUT","CHAT_ACCOUNT_INACTIVE",
 "CHAT_CHANNEL_UNAVAILABLE","CHAT_RULES_OR_MEMBERSHIP_REQUIRED","CHAT_MUTED",
 "CHAT_RATE_LIMIT","CHAT_IDEMPOTENCY_MISMATCH","CHAT_INVALID_MODERATION",
 "CHAT_STAFF_REQUIRED","CHAT_MESSAGE_NOT_FOUND","CHAT_STATE_CONFLICT"]);
class ChatError extends Error{constructor(status,code){super(code);this.status=status;}}
const need=response=>{if(response.error)throw new ChatError(503,"CHAT_DATA_UNAVAILABLE");return response.data;};
function dbClient(){
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw new ChatError(503,"CHAT_BACKEND_UNAVAILABLE");
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
async function authenticate(db,req){
 const header=String(req.headers.authorization||"");
 if(!/^Bearer\s+[^\s]+$/.test(header)||header.length>5000)throw new ChatError(401,"SIGN_IN_REQUIRED");
 const user=await db.auth.getUser(header.replace(/^Bearer\s+/,""));
 if(user.error||!user.data?.user)throw new ChatError(401,"SIGN_IN_REQUIRED");
 const link=need(await db.from("pup_web_auth_links").select("account_uuid")
  .eq("auth_user_id",user.data.user.id).maybeSingle());
 if(!link?.account_uuid)throw new ChatError(403,"PUP_ACCOUNT_REQUIRED");
 const account=need(await db.from("pup_accounts")
  .select("id,player_uuid,discord_user_id,username,display_name,status")
  .eq("id",link.account_uuid).maybeSingle());
 if(!account||account.status!=="active")throw new ChatError(403,"ACCOUNT_NOT_ACTIVE");
 const player=need(await db.from("pupeye_players").select("guild_role,status")
  .eq("id",account.player_uuid).maybeSingle());
 if(!player||player.status!=="active")throw new ChatError(403,"ACCOUNT_NOT_ACTIVE");
 const predicates=["player_uuid.eq."+account.player_uuid];
 if(/^\d{15,22}$/.test(account.discord_user_id||""))
  predicates.push("discord_user_id.eq."+account.discord_user_id);
 const targets=need(await db.from("pupeye_ban_targets").select("ban_uuid").or(predicates.join(",")))||[];
 const ids=[...new Set(targets.map(t=>t.ban_uuid).filter(isId))];
 if(ids.length){
  const bans=need(await db.from("pupeye_global_bans")
   .select("expires_at,revoked_at").in("id",ids).eq("status","active"))||[];
  if(bans.some(b=>!b.revoked_at&&(!b.expires_at||Date.parse(b.expires_at)>Date.now())))
   throw new ChatError(403,"ACCOUNT_BANNED");
 }
 return {account,staff:["ADMIN","DEVELOPER"].includes(player.guild_role),role:player.guild_role};
}
async function channelById(db,channelId){
 if(!isId(channelId))throw new ChatError(400,"INVALID_CHANNEL");
 const channel=need(await db.from("pup_social_channels")
  .select("id,server_id,slug,title,writable,active").eq("id",channelId).maybeSingle());
 if(!channel?.active)throw new ChatError(404,"CHANNEL_UNAVAILABLE");
 const server=need(await db.from("pup_social_servers")
  .select("id,active").eq("id",channel.server_id).maybeSingle());
 if(!server?.active)throw new ChatError(404,"CHANNEL_UNAVAILABLE");
 return channel;
}
async function requireMember(db,account,serverId){
 const membership=need(await db.from("pup_social_memberships")
  .select("server_id").eq("server_id",serverId).eq("account_uuid",account.id).maybeSingle());
 if(!membership)throw new ChatError(403,"CHAT_JOIN_REQUIRED");
}
async function listChannels(db,account){
 const servers=need(await db.from("pup_social_servers")
  .select("id,slug,title").eq("active",true).order("created_at",{ascending:true}).limit(30))||[];
 const ids=servers.map(s=>s.id);
 if(!ids.length)return {servers:[],channels:[],joinedServerIds:[],rulesAccepted:false};
 const channels=need(await db.from("pup_social_channels")
  .select("id,server_id,slug,title,writable,sort_order")
  .in("server_id",ids).eq("active",true).order("sort_order",{ascending:true}).limit(200))||[];
 const members=need(await db.from("pup_social_memberships")
  .select("server_id").eq("account_uuid",account.id).in("server_id",ids))||[];
 const rules=need(await db.from("pup_social_rules").select("version")
  .eq("account_uuid",account.id).maybeSingle());
 return {servers,channels,joinedServerIds:members.map(m=>m.server_id),rulesAccepted:rules?.version>=1};
}
async function listMessages(db,account,query){
 const channel=await channelById(db,query.channelId);
 await requireMember(db,account,channel.server_id);
 const cursor=typeof query.before==="string"&&query.before.length<40?Date.parse(query.before):NaN;
 let request=db.from("pup_social_messages")
  .select("id,account_uuid,body,created_at")
  .eq("channel_id",channel.id).eq("state","published")
  .order("created_at",{ascending:false}).limit(50);
 if(Number.isFinite(cursor))request=request.lt("created_at",new Date(cursor).toISOString());
 const messages=need(await request)||[];
 const own=need(await db.from("pup_social_messages")
  .select("id,body,state,created_at,screening_codes,moderation_reason")
  .eq("channel_id",channel.id).eq("account_uuid",account.id)
  .in("state",["pending","rejected","removed","expired"])
  .order("created_at",{ascending:false}).limit(20))||[];
 const senderIds=[...new Set(messages.map(m=>m.account_uuid))];
 const senders=senderIds.length?need(await db.from("pup_accounts")
  .select("id,username,display_name").in("id",senderIds))||[]:[];
 const senderMap=new Map(senders.map(a=>[a.id,a]));
 const blocks=need(await db.from("pup_social_blocks")
  .select("blocked_account_uuid").eq("blocker_account_uuid",account.id))||[];
 const blocked=new Set(blocks.map(x=>x.blocked_account_uuid));
 return {channelId:channel.id,items:messages.filter(m=>!blocked.has(m.account_uuid)).map(m=>({
  id:m.id,body:m.body,createdAt:m.created_at,
  sender:senderMap.get(m.account_uuid)?.display_name||senderMap.get(m.account_uuid)?.username||"Player",
  username:senderMap.get(m.account_uuid)?.username||"player"
 })),own:own.map(m=>({id:m.id,body:m.body,status:m.state,
  createdAt:m.created_at,reason:m.state==="rejected"?m.moderation_reason:null}))};
}
async function moderationQueue(db,actor){
 if(!actor.staff)throw new ChatError(403,"STAFF_ACCESS_REQUIRED");
 const records=need(await db.from("pup_social_messages")
  .select("id,channel_id,server_id,account_uuid,body,state,screening_codes,created_at")
  .eq("state","pending").order("created_at",{ascending:true}).limit(100))||[];
 const names=records.length?need(await db.from("pup_accounts")
  .select("id,username,display_name").in("id",[...new Set(records.map(m=>m.account_uuid))]))||[]:[];
 const users=new Map(names.map(a=>[a.id,a]));
 return {pending:records.map(m=>({
  id:m.id,channelId:m.channel_id,serverId:m.server_id,
  username:users.get(m.account_uuid)?.username||"unknown",
  displayName:users.get(m.account_uuid)?.display_name||null,
  body:m.body,createdAt:m.created_at,codes:m.screening_codes
 }))};
}
async function moderationHistory(db,actor,query){
 if(!actor.staff)throw new ChatError(403,"STAFF_ACCESS_REQUIRED");
 const before=typeof query.before==="string"&&query.before.length<40?Date.parse(query.before):NaN;
 let request=db.from("pup_social_messages")
  .select("id,channel_id,account_uuid,body,state,created_at,moderated_at,moderation_reason,screening_codes")
  .order("created_at",{ascending:false}).order("id",{ascending:false}).limit(51);
 if(Number.isFinite(before))request=request.lt("created_at",new Date(before).toISOString());
 const rows=need(await request)||[];
 const visible=rows.slice(0,50);
 const ids=[...new Set(visible.map(m=>m.account_uuid))];
 const users=ids.length?need(await db.from("pup_accounts")
  .select("id,username,display_name").in("id",ids))||[]:[];
 const lookup=new Map(users.map(u=>[u.id,u]));
 return {messages:visible.map(m=>({
  id:m.id,channelId:m.channel_id,
  username:lookup.get(m.account_uuid)?.username||"unknown",
  displayName:lookup.get(m.account_uuid)?.display_name||null,
  body:m.body,status:m.state,codes:m.screening_codes,
  createdAt:m.created_at,moderatedAt:m.moderated_at,
  moderationReason:m.moderation_reason||null
 })),nextBefore:rows.length>50?visible.at(-1)?.created_at:null};
}
async function moderationReports(db,actor){
 if(!actor.staff)throw new ChatError(403,"STAFF_ACCESS_REQUIRED");
 const reports=need(await db.from("pup_social_reports")
  .select("id,message_id,reporter_account_uuid,reason,created_at")
  .eq("state","open").order("created_at",{ascending:true}).limit(100))||[];
 const ids=[...new Set(reports.map(r=>r.message_id))];
 const messages=ids.length?need(await db.from("pup_social_messages")
  .select("id,body,state,account_uuid,channel_id").in("id",ids))||[]:[];
 const byId=new Map(messages.map(m=>[m.id,m]));
 const reporters=[...new Set(reports.map(r=>r.reporter_account_uuid))];
 const accounts=reporters.length?need(await db.from("pup_accounts")
  .select("id,username").in("id",reporters))||[]:[];
 const names=new Map(accounts.map(a=>[a.id,a.username]));
 return {reports:reports.map(r=>({
  id:r.id,messageId:r.message_id,reporter:names.get(r.reporter_account_uuid)||"unknown",
  reason:r.reason,createdAt:r.created_at,
  body:byId.get(r.message_id)?.body||"[unavailable]",
  messageStatus:byId.get(r.message_id)?.state||"unknown"
 }))};
}
async function resolveReport(db,actor,body){
 if(!actor.staff)throw new ChatError(403,"STAFF_ACCESS_REQUIRED");
 if(!isId(body.reportId)||typeof body.reason!=="string"
  ||body.reason.trim().length<3||body.reason.length>300)
  throw new ChatError(400,"CHAT_INVALID_MODERATION");
 const response=await db.rpc("pup_social_resolve_report",{
  p_actor:actor.account.id,p_report:body.reportId,p_reason:body.reason.trim()
 });
 if(response.error)throw new ChatError(409,"CHAT_REPORT_UNAVAILABLE");
 return {resolved:true};
}
async function acceptRules(db,account){
 const relation=db.from("pup_social_rules");
 const old=need(await relation.select("version").eq("account_uuid",account.id).maybeSingle());
 if(old){need(await relation.update({version:1,accepted_at:new Date().toISOString()})
  .eq("account_uuid",account.id));}
 else need(await relation.insert({account_uuid:account.id,version:1}));
 return {accepted:true,version:1};
}
async function joinServer(db,account,id){
 if(!isId(id))throw new ChatError(400,"INVALID_SERVER");
 const server=need(await db.from("pup_social_servers").select("id,active").eq("id",id).maybeSingle());
 if(!server?.active)throw new ChatError(404,"SERVER_UNAVAILABLE");
 const rules=need(await db.from("pup_social_rules").select("version")
  .eq("account_uuid",account.id).maybeSingle());
 if(!rules?.version)throw new ChatError(409,"CHAT_RULES_REQUIRED");
 const membership=need(await db.from("pup_social_memberships").select("server_id")
  .eq("server_id",id).eq("account_uuid",account.id).maybeSingle());
 if(!membership){
  const created=await db.from("pup_social_memberships").insert({server_id:id,account_uuid:account.id});
  if(created.error?.code!=="23505"&&created.error)throw new ChatError(503,"CHAT_DATA_UNAVAILABLE");
 }
 return {joined:true,serverId:id};
}
async function submit(db,account,body){
 if(!isId(body.channelId)||!isId(body.clientKey))throw new ChatError(400,"CHAT_INVALID_INPUT");
 let screening;
 try{screening=screenPupEyeChat(body.text);}catch(e){
  throw new ChatError(400,["CHAT_EMPTY_MESSAGE","CHAT_MESSAGE_TOO_LONG","CHAT_INVALID_CHARACTERS"].includes(e.message)?e.message:"CHAT_INVALID_INPUT");
 }
 const result=await db.rpc("pup_social_submit",{
  p_account:account.id,p_channel:body.channelId,p_text:screening.body,
  p_client_key:body.clientKey,p_screening_codes:screening.screeningCodes,
  p_screening_version:screening.screeningVersion
 });
 if(result.error){const code=result.error.message.split(" ")[0];
  throw new ChatError(allowedCodes.has(code)?409:503,allowedCodes.has(code)?code:"CHAT_SUBMISSION_UNAVAILABLE");}
 return {messageId:result.data,status:"pending",notice:"PupEye is holding this message for staff approval."};
}
async function review(db,actor,body){
 if(!actor.staff)throw new ChatError(403,"STAFF_ACCESS_REQUIRED");
 if(!isId(body.messageId)||!["approve","reject","remove","restore"].includes(body.decision)
   ||typeof body.reason!=="string"||body.reason.trim().length<3||body.reason.length>300)
   throw new ChatError(400,"CHAT_INVALID_MODERATION");
 const response=await db.rpc("pup_social_review",{
  p_actor:actor.account.id,p_message:body.messageId,
  p_action:body.decision,p_reason:body.reason.trim()
 });
 if(response.error){const code=response.error.message.split(" ")[0];
  throw new ChatError(allowedCodes.has(code)?409:503,allowedCodes.has(code)?code:"CHAT_REVIEW_UNAVAILABLE");}
 return {updated:true,status:response.data};
}
async function report(db,actor,body){
 if(!isId(body.messageId)||typeof body.reason!=="string"||
 body.reason.trim().length<3||body.reason.trim().length>300)
  throw new ChatError(400,"CHAT_INVALID_REPORT");
 const result=await db.rpc("pup_social_report",{
  p_account:actor.account.id,p_message:body.messageId,p_reason:body.reason.trim()
 });
 if(result.error){
  const code=result.error.message.split(" ")[0];
  const publicErrors=new Set(["CHAT_INVALID_REPORT","MESSAGE_UNAVAILABLE","CHAT_JOIN_REQUIRED","CHAT_REPORT_RATE_LIMIT"]);
  throw new ChatError(publicErrors.has(code)?409:503,publicErrors.has(code)?code:"CHAT_REPORT_UNAVAILABLE");
 }
 return {reported:true};
}
async function mute(db,actor,body){
 if(!actor.staff)throw new ChatError(403,"STAFF_ACCESS_REQUIRED");
 if(!isId(body.messageId)||!Number.isInteger(body.hours)||body.hours<0||body.hours>168||
 typeof body.reason!=="string"||body.reason.trim().length<3||body.reason.length>300)
  throw new ChatError(400,"CHAT_INVALID_MODERATION");
 const result=await db.rpc("pup_social_manage_mute",{
  p_actor:actor.account.id,p_message:body.messageId,
  p_hours:body.hours,p_reason:body.reason.trim()
 });
 if(result.error)throw new ChatError(409,"CHAT_MUTE_UNAVAILABLE");
 return {updated:true,muted:body.hours>0};
}
async function block(db,actor,body){
 if(!isId(body.messageId))throw new ChatError(400,"INVALID_BLOCK");
 const message=need(await db.from("pup_social_messages")
  .select("account_uuid,server_id,state").eq("id",body.messageId).maybeSingle());
 if(!message||message.state!=="published")throw new ChatError(404,"MESSAGE_UNAVAILABLE");
 await requireMember(db,actor.account,message.server_id);
 const target=message.account_uuid;
 if(target===actor.account.id)throw new ChatError(400,"INVALID_BLOCK");
 const relation=db.from("pup_social_blocks");
 if(body.blocked===false){
  need(await relation.delete().eq("blocker_account_uuid",actor.account.id)
    .eq("blocked_account_uuid",target));
  return {blocked:false};
 }
 const created=await relation.insert({blocker_account_uuid:actor.account.id,
  blocked_account_uuid:target});
 if(created.error&&created.error.code!=="23505")
  throw new ChatError(503,"CHAT_BLOCK_UNAVAILABLE");
 return {blocked:true};
}
export default async function handler(req,res){
 res.setHeader("Content-Type","application/json; charset=utf-8");
 res.setHeader("Cache-Control","private, no-store, max-age=0");
 res.setHeader("X-Content-Type-Options","nosniff");
 try{
  if(!CHAT_ENABLED)throw new ChatError(503,"CHAT_NOT_LAUNCHED");
  if(!["GET","POST"].includes(req.method))throw new ChatError(405,"METHOD_NOT_ALLOWED");
  const db=dbClient(),actor=await authenticate(db,req);
  let result;
  if(req.method==="GET"){
   switch(req.query?.action){
    case "channels":result=await listChannels(db,actor.account);break;
    case "messages":result=await listMessages(db,actor.account,req.query);break;
    case "queue":result=await moderationQueue(db,actor);break;
    case "reports":result=await moderationReports(db,actor);break;
    case "history":result=await moderationHistory(db,actor,req.query);break;
    default:throw new ChatError(400,"INVALID_ACTION");
   }
  }else{
   const body=req.body||{};
   switch(body.action){
    case "accept-rules":result=await acceptRules(db,actor.account);break;
    case "join":result=await joinServer(db,actor.account,body.serverId);break;
    case "send":result=await submit(db,actor.account,body);break;
    case "review":result=await review(db,actor,body);break;
    case "report":result=await report(db,actor,body);break;
    case "mute":result=await mute(db,actor,body);break;
    case "resolve-report":result=await resolveReport(db,actor,body);break;
    case "block":result=await block(db,actor,body);break;
    default:throw new ChatError(400,"INVALID_ACTION");
   }
  }
  return res.status(200).json({ok:true,...result});
 }catch(error){return res.status(error instanceof ChatError?error.status:503)
   .json({ok:false,error:error instanceof ChatError?error.message:"CHAT_UNAVAILABLE"});}
}
