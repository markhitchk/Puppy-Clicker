import {dbClient,ensure,validateRequest,getPupIdentity,PupError,fail} from "./_lib/pupIdentity.js";
const BUCKET="pup-profile-avatars";
const AVATAR_NAME=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/avatar-[0-9]{10,15}\.(png|jpg|webp)$/;
const safeUrl=(db,path)=>path?db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl:null;
export default async function handler(req,res){
 try{
  validateRequest(req,res);
  const db=dbClient();
  const actor=await getPupIdentity(req,db);
  const action=req.body?.action;
  if(action==="read"){
   return res.status(200).json({ok:true,avatarPath:actor.account.profile_avatar_path||null,
    avatarUrl:safeUrl(db,actor.account.profile_avatar_path)});
  }
  if(action==="update"){
   const path=req.body?.avatarPath;
   if(path!==null&&
     (typeof path!=="string"||!AVATAR_NAME.test(path)||!path.startsWith(actor.uid+"/")))
    throw new PupError(400,"AVATAR_PATH_INVALID");
   if(path){
    const object=ensure(await db.schema("storage").from("objects")
     .select("name,metadata,owner_id").eq("bucket_id",BUCKET).eq("name",path).maybeSingle());
    if(!object||object.owner_id!==actor.uid)throw new PupError(403,"AVATAR_NOT_OWNED");
    const mime=object.metadata?.mimetype;
    if(!["image/jpeg","image/png","image/webp"].includes(mime))
     throw new PupError(400,"AVATAR_TYPE_INVALID");
   }
   ensure(await db.from("pup_accounts").update({
    profile_avatar_path:path,updated_at:new Date().toISOString()
   }).eq("id",actor.account.id).eq("status","active").select("id").single());
   return res.status(200).json({ok:true,updated:true,avatarPath:path,avatarUrl:safeUrl(db,path)});
  }
  throw new PupError(400,"INVALID_AVATAR_ACTION");
 }catch(error){return fail(res,error);}
}
