import {normalizeAvatarUrl} from "../../src/avatarUrl.js";
const BUCKET="pup-profile-avatars";
const PATH=/^[0-9a-f-]{36}\/avatar\.(png|jpg|webp)$/i;
/** Only intended public avatar media URLs are ever returned; never personal identifiers. */
export function publicAvatarUrl(db,account){
 const direct=normalizeAvatarUrl(account?.profile_avatar_url);
 if(direct)return direct;
 const path=account?.profile_avatar_path;
 if(typeof path!=="string"||!PATH.test(path))return null;
 const source=db.storage?.from(BUCKET).getPublicUrl(path).data?.publicUrl;
 const safe=normalizeAvatarUrl(source);
 return safe?safe+"?v="+encodeURIComponent(account.updated_at||"1"):null;
}
