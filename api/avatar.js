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
    const info=await db.storage.from(BUCKET).info(path);
    if(info.error||!info.data)throw new PupError(404,"AVATAR_NOT_FOUND");
    if(Number(info.data.size||0)>2097152)throw new PupError(400,"AVATAR_TOO_LARGE");
   }
   ensure(await db.from("pup_accounts").update({
    profile_avatar_path:path,updated_at:new Date().toISOString()
   }).eq("id",actor.account.id).eq("status","active").select("id").single());
   return res.status(200).json({ok:true,updated:true,avatarPath:path,avatarUrl:safeUrl(db,path)});
  }
  throw new PupError(400,"INVALID_AVATAR_ACTION");
 }catch(error){return fail(res,error);}
}
