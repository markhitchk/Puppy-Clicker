import {checkWebPupEye,WebPupEyeError} from './_lib/webPupEye.js';
import {randomUUID} from "node:crypto";
import {dbClient,ensure,validateRequest,getPupIdentity,PupError,fail,isStaff} from "./_lib/pupIdentity.js";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const validId=value=>typeof value==="string"&&UUID.test(value);
const validPuppy=value=>typeof value==="string"&&/^[a-z0-9_]{2,80}$/.test(value);
const staffRequired=actor=>{if(!isStaff(actor))throw new PupError(403,"STAFF_ACCESS_REQUIRED");};
async function policy(db,puppyId){
 if(!validPuppy(puppyId))throw new PupError(400,"INVALID_PUPPY");
 const row=ensure(await db.from("pup_exchange_transfer_policy")
  .select("puppy_id,giftable,tradeable,bound,source_copy").eq("puppy_id",puppyId).maybeSingle());
 if(!row)throw new PupError(404,"PUPPY_UNKNOWN");
 return row;
}
async function audit(db,actor,target,action,detail){
 const result=await db.from("pup_admin_actions").insert({
  actor_player_uuid:actor.player.id,target_player_uuid:target,
  action_code:action,detail:{source:"web_system_gift",...detail}
 });
 return result.error?["Audit recording failed"]: [];
}
async function callRarity(db,name,args){
 const {data,error}=await db.rpc(name,args);
 if(!error)return data;
 const codes={OWNER_REQUIRED:403,STAFF_REQUIRED:403,VERSION_CONFLICT:409,OPERATION_REUSED:409,
  INVALID_CHANGE:400,INVALID_GIFT:400,PUPPY_ALREADY_OWNED:409,REQUEST_NOT_PENDING:409,
  TARGET_ACCOUNT_NOT_ACTIVE:409,TARGET_CLOUD_SAVE_REQUIRED:409,PUPPY_NOT_REQUESTABLE:403};
 if(Object.hasOwn(codes,error.message))throw new PupError(codes[error.message],error.message);
 if(["23514","23502","22P02","P0002"].includes(error.code))throw new PupError(400,"INVALID_CATALOG_ENTRY");
 throw new PupError(503,"PUP_DATA_UNAVAILABLE");
}
async function grant(db,actor,body){
 staffRequired(actor);
 if(!validId(body.targetPlayerId)||!validPuppy(body.puppyId))throw new PupError(400,"INVALID_GIFT");
 return callRarity(db,"pup_rarity_gift",{p_actor:actor.account.id,p_target:body.targetPlayerId,
  p_puppy:body.puppyId,p_operation:body.operationId||body.requestId||randomUUID(),
  p_reason:body.reason||"System puppy gift",p_request:body.requestId||null});
}
async function submitRequest(db,actor,body){
 const puppyId=body.puppyId;
 const rule=await policy(db,puppyId);
 const published=ensure(await db.rpc("pup_rarity_public"));
 if(!published.some(p=>p.puppy_id===puppyId&&p.rarity!=="unobtainable")||!rule.giftable||rule.bound||rule.source_copy)throw new PupError(403,"PUPPY_NOT_REQUESTABLE");
 const note=String(body.note??"").trim();
 if(note.length>400)throw new PupError(400,"NOTE_TOO_LONG");
 const prev=ensure(await db.from("pup_gift_requests")
  .select("id,created_at").eq("account_uuid",actor.account.id)
  .order("created_at",{ascending:false}).limit(1));
 if(prev?.length&&Date.parse(prev[0].created_at)>Date.now()-86400000)
  throw new PupError(429,"REQUEST_COOLDOWN");
 const inserted=await db.from("pup_gift_requests").insert({
  account_uuid:actor.account.id,player_uuid:actor.player.id,puppy_id:puppyId,note
 }).select("id,puppy_id,status,created_at").single();
 if(inserted.error)throw new PupError(inserted.error.code==="23505"?409:503,
   inserted.error.code==="23505"?"REQUEST_ALREADY_PENDING":"REQUEST_FAILED");
 return {request:inserted.data};
}
async function review(db,actor,body){
 staffRequired(actor);
 if(!validId(body.requestId))throw new PupError(400,"INVALID_REQUEST");
 const request=ensure(await db.from("pup_gift_requests")
  .select("id,player_uuid,status").eq("id",body.requestId).maybeSingle());
 if(!request||request.status!=="pending")throw new PupError(409,"REQUEST_NOT_PENDING");
 const note=String(body.note||"").trim().slice(0,400);
 const update=ensure(await db.from("pup_gift_requests").update({
  status:"declined",review_note:note,
  reviewed_at:new Date().toISOString(),reviewed_by_player_uuid:actor.player.id
 }).eq("id",request.id).eq("status","pending").select("id").maybeSingle());
 if(!update)throw new PupError(409,"REQUEST_NOT_PENDING");
 await audit(db,actor,request.player_uuid,"WEB_PUPPY_REQUEST_DECLINED",{requestId:request.id});
 return {declined:true};
}
export default async function handler(req,res){
 try{
  validateRequest(req,res);
  const db=dbClient();
  const actor=await getPupIdentity(req,db);
  await checkWebPupEye(db,actor.account.id,'gift',req.headers,{vercel:process.env.VERCEL==='1'});
  const {action}=req.body||{};
  let result;
  if(action==="pupdex-owned"){
   const save=ensure(await db.from("pup_account_saves")
    .select("save_data").eq("player_uuid",actor.player.id).eq("account_uuid",actor.account.id).maybeSingle());
   const saved=save?.save_data?.stores?.puppy_clicker_save?.values?.unlocked_puppies;
   const owned=new Set(["classic","golden","spotty","poodle",...(Array.isArray(saved)?saved:[])]);
   const published=ensure(await db.rpc("pup_rarity_public"));
   result={owned:published.filter(p=>owned.has(p.puppy_id)).map(p=>p.puppy_id)};
  }else if(action==="catalog"){
   const rows=ensure(await db.rpc("pup_rarity_public"));
   const staff=isStaff(actor);
   const owner=staff&&(await callRarity(db,"pup_rarity_manage",{p_actor:actor.account.id,p_action:"read",p_body:{}})).canEdit;
   result={puppies:rows.filter(p=>owner||p.giftable&&!p.bound&&!p.source_copy&&p.rarity!=="unobtainable"),role:actor.role};
  }else if(action==="rarity-read"||action==="rarity-update"){
   result=await callRarity(db,"pup_rarity_manage",{p_actor:actor.account.id,
    p_action:action==="rarity-read"?"read":"update",p_body:req.body});
  }else if(action==="my-requests"){
   const requests=ensure(await db.from("pup_gift_requests")
    .select("id,puppy_id,note,status,created_at,reviewed_at,review_note")
    .eq("account_uuid",actor.account.id).order("created_at",{ascending:false}).limit(30))||[];
   result={requests};
  }else if(action==="request"){
   result=await submitRequest(db,actor,req.body);
  }else if(action==="staff-requests"){
   staffRequired(actor);
   const requests=ensure(await db.from("pup_gift_requests")
    .select("id,account_uuid,player_uuid,puppy_id,note,status,created_at,reviewed_at,review_note")
    .order("created_at",{ascending:false}).limit(100))||[];
   const ids=[...new Set(requests.map(x=>x.account_uuid))];
   const accounts=ids.length?ensure(await db.from("pup_accounts")
    .select("id,username,display_name").in("id",ids)):[];
   const names=new Map(accounts.map(x=>[x.id,x]));
   result={requests:requests.map(x=>({...x,username:names.get(x.account_uuid)?.username||"Unknown",
    displayName:names.get(x.account_uuid)?.display_name||null}))};
  }else if(action==="gift"){
   result=await grant(db,actor,req.body);
  }else if(action==="decline"){
   result=await review(db,actor,req.body);
  }else throw new PupError(400,"INVALID_GIFT_ACTION");
  return res.status(200).json({ok:true,...result});
 }catch(error){
  return fail(res,error instanceof WebPupEyeError?new PupError(error.status,error.code):error);
 }
}
