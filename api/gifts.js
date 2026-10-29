import {createHash} from "node:crypto";
import {dbClient,ensure,validateRequest,getPupIdentity,PupError,fail,isStaff,canonicalJson} from "./_lib/pupIdentity.js";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const validId=value=>typeof value==="string"&&UUID.test(value);
const validPuppy=value=>typeof value==="string"&&/^[a-z0-9_]{2,80}$/.test(value);
const staffRequired=actor=>{if(!isStaff(actor))throw new PupError(403,"STAFF_ACCESS_REQUIRED");};
const ownedList=value=>Array.isArray(value)?value.filter(x=>typeof x==="string"):[];
async function policy(db,puppyId){
 if(!validPuppy(puppyId))throw new PupError(400,"INVALID_PUPPY");
 const row=ensure(await db.from("pup_exchange_transfer_policy")
  .select("puppy_id,giftable,tradeable,bound,source_copy").eq("puppy_id",puppyId).maybeSingle());
 if(!row)throw new PupError(404,"PUPPY_UNKNOWN");
 return row;
}
async function targetAccount(db,id){
 if(!validId(id))throw new PupError(400,"INVALID_TARGET");
 const account=ensure(await db.from("pup_accounts")
  .select("id,player_uuid,username,status").eq("player_uuid",id).maybeSingle());
 if(!account||account.status!=="active")throw new PupError(409,"TARGET_ACCOUNT_NOT_ACTIVE");
 const player=ensure(await db.from("pupeye_players")
  .select("id,status").eq("id",id).maybeSingle());
 if(!player||player.status!=="active")throw new PupError(409,"TARGET_ACCOUNT_NOT_ACTIVE");
 return account;
}
async function audit(db,actor,target,action,detail){
 const result=await db.from("pup_admin_actions").insert({
  actor_player_uuid:actor.player.id,target_player_uuid:target,
  action_code:action,detail:{source:"web_system_gift",...detail}
 });
 return result.error?["Audit recording failed"]: [];
}
async function sendNotice(db,actor,target,puppyId){
 const response=await db.from("pup_system_notifications").insert({
  player_uuid:target,created_by_player_uuid:actor.player.id,
  kind:"developer",title:"A puppy has joined your collection 🐾",
  body:puppyId+" was granted to your Pup Account by Puppy Clicker staff.",
  detail:{source:"web_admin_system_gift",puppyId}
 });
 return response.error?["Player notification failed"]:[];
}
async function grant(db,actor,body){
 staffRequired(actor);
 const playerId=body.targetPlayerId;
 const puppyId=body.puppyId;
 const target=await targetAccount(db,playerId);
 const rule=await policy(db,puppyId);
 // Administrators may grant only ordinary transferable puppies. Explicit
 // Developer permission is required for account-bound/test/developer puppies.
 if((rule.bound||!rule.giftable)&&actor.role!=="DEVELOPER")
  throw new PupError(403,"DEVELOPER_GIFT_REQUIRED");
 let request=null;
 if(body.requestId!=null){
  if(!validId(body.requestId))throw new PupError(400,"INVALID_REQUEST");
  request=ensure(await db.from("pup_gift_requests").select("*")
   .eq("id",body.requestId).maybeSingle());
  if(!request||request.status!=="pending"||
   request.player_uuid!==playerId||request.puppy_id!==puppyId||
   request.account_uuid!==target.id)throw new PupError(409,"REQUEST_NOT_PENDING");
 }
 const save=ensure(await db.from("pup_account_saves").select("player_uuid,revision,save_data")
  .eq("player_uuid",playerId).maybeSingle());
 if(!save||!save.save_data?.stores?.puppy_clicker_save?.values||
    !save.save_data?.stores?.puppy_clicker_save?.types)
  throw new PupError(409,"TARGET_CLOUD_SAVE_REQUIRED");
 const data=structuredClone(save.save_data);
 const store=data.stores.puppy_clicker_save;
 const unlocked=new Set(ownedList(store.values.unlocked_puppies));
 if(unlocked.has(puppyId))throw new PupError(409,"PUPPY_ALREADY_OWNED");
 unlocked.add(puppyId);
 store.values.unlocked_puppies=[...unlocked].sort();
 store.types.unlocked_puppies="string_set";
 data.savedAtEpochMs=Date.now();
 const revision=Number(save.revision)+1;
 const hash=createHash("sha256").update(canonicalJson(data)).digest("hex");
 const saved=ensure(await db.from("pup_account_saves")
  .update({save_data:data,revision,payload_hash_sha256:hash,updated_at:new Date().toISOString()})
  .eq("player_uuid",playerId).eq("revision",save.revision)
  .select("revision").maybeSingle());
 if(!saved)throw new PupError(409,"GIFT_SAVE_CONFLICT");
 const warnings=[];
 if(request){
  const update=await db.from("pup_gift_requests").update({
   status:"approved",reviewed_at:new Date().toISOString(),
   reviewed_by_player_uuid:actor.player.id, gifted_revision:revision
  }).eq("id",request.id).eq("status","pending").select("id").maybeSingle();
  if(update.error||!update.data)warnings.push("Request status could not be updated; puppy was granted.");
 }
 warnings.push(...await audit(db,actor,playerId,"WEB_SYSTEM_PUPPY_GRANTED",{
  puppyId,revision,requestId:request?.id||null,bound:!!rule.bound
 }));
 warnings.push(...await sendNotice(db,actor,playerId,puppyId));
 return {granted:true,revision,warnings};
}
async function submitRequest(db,actor,body){
 const puppyId=body.puppyId;
 const rule=await policy(db,puppyId);
 if(!rule.giftable||rule.bound)throw new PupError(403,"PUPPY_NOT_REQUESTABLE");
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
  const {action}=req.body||{};
  let result;
  if(action==="catalog"){
   const rows=ensure(await db.from("pup_exchange_transfer_policy")
    .select("puppy_id,giftable,tradeable,bound").order("puppy_id"))||[];
   result={puppies:rows.filter(p=>isStaff(actor)||p.giftable&&!p.bound),
    role:actor.role};
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
 }catch(error){return fail(res,error);}
}
