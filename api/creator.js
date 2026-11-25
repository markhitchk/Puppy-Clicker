import {readFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import sharp from "sharp";
import {sendCreatorDiscord} from "./_lib/creatorDiscord.js";
import {dbClient,ensure,validateRequest,getPupIdentity,PupError,fail} from "./_lib/pupIdentity.js";
import {MAX_BODY,validateCreatorPackage,sanitizeCreatorPackage} from "./_lib/creatorPackage.js";
const table="pup_creator_submissions",metadata="id,username,name,description,generation,status,delivery,created_at,reviewed_at,review_note,published_puppy_id";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function webhook(){
 const value=process.env.PUP_CREATOR_DISCORD_WEBHOOK_URL;
 try{const u=new URL(value);if(u.protocol==="https:"&&u.hostname==="discord.com"&&/^\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+$/.test(u.pathname)){u.search="wait=true";return u.toString();}}catch{}
 throw new PupError(503,"CREATOR_DISCORD_NOT_CONFIGURED");
}
async function ownerOnly(db,actor){
 const r=await db.rpc("pup_rarity_manage",{p_actor:actor.account.id,p_action:"read",p_body:{}});
 if(r.error||r.data?.canEdit!==true)throw new PupError(403,"OWNER_REQUIRED");
}
async function sanitized(p){
 try{const clean=validateCreatorPackage(p);const original=clean.generation==="v1"?await readFile(new URL("../public/assets/test/v1_test_crash_dummy.png",import.meta.url)):await readFile(new URL("../public/assets/test/v2_test_crash_dummy.png",import.meta.url));return await sanitizeCreatorPackage(clean,sharp,original);}
 catch{throw new PupError(400,"INVALID_CREATOR_PACKAGE");}
}
async function deliver(db,row,url){
 const claim=ensure(await db.from(table).update({delivery:"sending",delivery_attempted_at:new Date().toISOString()}).eq("id",row.id).in("delivery",["pending","failed"]).select("id,project,username,name,generation").maybeSingle());
 if(!claim)return;
 const {delivery,messageId}=await sendCreatorDiscord(claim,url);
 ensure(await db.from(table).update({delivery,discord_message_id:messageId}).eq("id",claim.id).eq("delivery","sending"));
}
async function testDiscord(){
 const url=webhook();
 const png=await readFile(new URL("../public/assets/test/v1_test_crash_dummy.png",import.meta.url));
 const blank=await sharp({create:{width:256,height:256,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).png().toBuffer();
 const artwork="data:image/png;base64,"+blank.toString("base64");
 const project=await sanitized({format:"puppy-clicker.pup",version:2,generation:"v1",sourceTemplateId:"creator_v1_clean",templateVersion:2,width:256,height:256,name:"Pup Creator delivery test",description:"Synthetic integration test; not a player submission.",layers:[{id:"test",name:"Test artwork",visible:true,opacity:1,artwork}]});
 return sendCreatorDiscord({name:project.name,username:"System test",generation:"v1",project},url,{test:true});
}
async function submit(db,actor,body,adminImport=false){
 if(body.acceptTerms!==true)throw new PupError(400,"CREATOR_TERMS_REQUIRED");
 const url=adminImport?null:webhook();
 // A downloaded Discord package points to the original immutable review row.
 if(adminImport&&body.project?.submissionId!==undefined){
  const id=body.project.submissionId;
  if(typeof id!=="string"||!uuid.test(id))throw new PupError(400,"INVALID_SUBMISSION_ID");
  const original=ensure(await db.from(table).select(metadata+",project").eq("id",id).maybeSingle());
  if(!original)throw new PupError(404,"SUBMISSION_NOT_FOUND");
  const {submissionId,...downloaded}=body.project;
  const equal=JSON.stringify(validateCreatorPackage(downloaded))===JSON.stringify(validateCreatorPackage(original.project))&&downloaded.artwork===original.project.artwork;
  if(!equal)throw new PupError(409,"CREATOR_PACKAGE_MISMATCH");
  delete original.project;return {submission:original};
 }
 const project=await sanitized(body.project);
 const hash=createHash("sha256").update(JSON.stringify(project)).digest("hex");
 let row=ensure(await db.from(table).select(metadata).eq("account_uuid",actor.account.id).eq("content_hash",hash).maybeSingle());
 if(!row){
  const inserted=await db.from(table).insert({account_uuid:actor.account.id,username:actor.account.username,content_hash:hash,name:project.name,description:project.description,generation:project.generation,project,delivery:adminImport?"not_required":"pending"}).select(metadata).single();
  if(inserted.error){
   if(inserted.error.code!=="23505")throw new PupError(503,"CREATOR_STORAGE_UNAVAILABLE");
   row=ensure(await db.from(table).select(metadata).eq("account_uuid",actor.account.id).eq("content_hash",hash).maybeSingle());
   if(!row)throw new PupError(429,"CREATOR_DAILY_LIMIT");
  }else row=inserted.data;
 }
 if(url&&row.delivery==="pending")await deliver(db,row,url);
 return {submission:ensure(await db.from(table).select(metadata).eq("id",row.id).single())};
}
export default async function handler(req,res){
 try{
  validateRequest(req,res,MAX_BODY);
  if(!req.body||typeof req.body!=="object"||Buffer.byteLength(JSON.stringify(req.body))>MAX_BODY)throw new PupError(413,"REQUEST_TOO_LARGE");
  const db=dbClient(),actor=await getPupIdentity(req,db),body=req.body;
  const action=body.action;
  if(action==="submit")return res.status(200).json({ok:true,...await submit(db,actor,body)});
  if(action==="mine"){
   const rows=ensure(await db.from(table).select(metadata).eq("account_uuid",actor.account.id).order("created_at",{ascending:false}).limit(60));
   return res.status(200).json({ok:true,submissions:rows});
  }
  await ownerOnly(db,actor);
  if(action==="discord-test")return res.status(200).json({ok:true,test:await testDiscord()});
  if(action==="import")return res.status(200).json({ok:true,...await submit(db,actor,body,true)});
  if(action==="review-list"){
   const rows=ensure(await db.from(table).select(metadata).order("created_at",{ascending:false}).limit(100));
   return res.status(200).json({ok:true,submissions:rows});
  }
  if(!uuid.test(body.id||""))throw new PupError(400,"INVALID_SUBMISSION_ID");
  const row=ensure(await db.from(table).select(metadata).eq("id",body.id).maybeSingle());
  if(!row)throw new PupError(404,"SUBMISSION_NOT_FOUND");
  if(action==="download"){
   const data=ensure(await db.from(table).select("project").eq("id",row.id).single());
   return res.status(200).json({ok:true,project:{...data.project,submissionId:row.id}});
  }
  if(action==="retry"){
   if(!["failed","pending"].includes(row.delivery))throw new PupError(409,"CREATOR_DELIVERY_NOT_RETRYABLE");
   await deliver(db,row,webhook());
   return res.status(200).json({ok:true,submission:ensure(await db.from(table).select(metadata).eq("id",row.id).single())});
  }
  if(action==="review"){
   const allowed={pending:["approved","rejected","revision","archived"],approved:["archived"],rejected:["archived"],revision:["archived"]};
   if(!allowed[row.status]?.includes(body.status)||typeof body.note!=="string"||body.note.length>400)throw new PupError(400,"INVALID_REVIEW");
   const update=ensure(await db.from(table).update({status:body.status,review_note:body.note.trim(),reviewed_at:new Date().toISOString(),reviewed_by:actor.account.id}).eq("id",row.id).eq("status",row.status).select(metadata).maybeSingle());
   if(!update)throw new PupError(409,"REVIEW_CONFLICT");
   return res.status(200).json({ok:true,submission:update});
  }
  if(action==="publish"){
   if(!["common","uncommon","rare","epic","legendary"].includes(body.rarity)||typeof body.reward!=="boolean"||typeof body.credit!=="boolean")throw new PupError(400,"INVALID_CREATOR_PUBLICATION");
   const {data,error}=await db.rpc("pup_creator_publish",{p_actor:actor.account.id,p_submission:row.id,p_rarity:body.rarity,p_reward:body.reward,p_credit:body.credit});
   if(error){const codes={OWNER_REQUIRED:403,SUBMISSION_NOT_FOUND:404,CREATOR_NOT_APPROVED:409,TARGET_ACCOUNT_NOT_ACTIVE:409,TARGET_CLOUD_SAVE_REQUIRED:409,INVALID_CREATOR_PUBLICATION:400};throw new PupError(codes[error.message]||503,codes[error.message]?error.message:"CREATOR_PUBLICATION_UNAVAILABLE");}
   return res.status(200).json({ok:true,publication:data,submission:ensure(await db.from(table).select(metadata).eq("id",row.id).single())});
  }
  throw new PupError(400,"INVALID_CREATOR_ACTION");
 }catch(e){return fail(res,e);}
}
