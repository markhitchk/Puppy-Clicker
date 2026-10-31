import test from "node:test";
import assert from "node:assert/strict";
import {publicAvatarUrl} from "../api/_lib/publicAvatar.js";
const db={storage:{from:bucket=>({getPublicUrl:path=>({data:{publicUrl:"https://assets.example.com/"+bucket+"/"+path}})})}};
test("chat avatars reuse approved public Pup Account URLs",()=>{
 assert.equal(publicAvatarUrl(db,{profile_avatar_url:"https://cdn.example.com/puppy.png"}),"https://cdn.example.com/puppy.png");
 assert.equal(publicAvatarUrl(db,{profile_avatar_url:"http://localhost/photo.png"}),null);
});
test("chat avatars reuse storage-backed public images and omit invalid paths",()=>{
 const account={profile_avatar_path:"b5c30c98-9130-4e18-b4db-ec65127044af/avatar.webp",updated_at:"2026-10-31"};
 assert.match(publicAvatarUrl(db,account),/pup-profile-avatars.*avatar.webp\?v=2026-10-31/);
 assert.equal(publicAvatarUrl(db,{profile_avatar_path:"../../private.key"}),null);
});
