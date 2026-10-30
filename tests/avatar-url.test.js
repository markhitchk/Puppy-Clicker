import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {normalizeAvatarUrl} from "../src/avatarUrl.js";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("public HTTPS avatar image URLs normalize without requiring an extension",()=>{
 assert.equal(normalizeAvatarUrl(" https://cdn.discordapp.com/avatars/user/hash.webp?size=256 "),
  "https://cdn.discordapp.com/avatars/user/hash.webp?size=256");
 assert.equal(normalizeAvatarUrl("https://images.example.com/id/123"),"https://images.example.com/id/123");
});

test("unsafe, private or malformed avatar URLs cannot be stored",()=>{
 for(const value of ["http://example.com/x.png","javascript:alert(1)","data:image/svg+xml,...",
  "https://user:pass@example.com/x.png","https://localhost/x.png","https://mybox.local/x.png",
  "https://127.0.0.1/x.png","https://192.168.1.1/x.png","https://[::1]/x.png",
  "https://example.com:8443/x.png","https://example.com/"+"a".repeat(2050),null,42]){
  assert.equal(normalizeAvatarUrl(value),null,String(value));
 }
});

test("website avatar editor is URL-based and API persists the dedicated field",()=>{
 const editor=read("src/ProfileAvatarEditor.jsx");
 const api=read("api/avatar.js");
 const identity=read("api/_lib/pupIdentity.js");
 assert.match(editor,/type="url"/);
 assert.match(editor,/Save avatar URL/);
 assert.doesNotMatch(editor,/type="file"|storage\.from|\.upload\(/);
 assert.match(api,/profile_avatar_url:url,profile_avatar_path:null/);
 assert.match(api,/profile_avatar_url:null,profile_avatar_path:path/);
 assert.match(api,/avatarUrl:accountAvatar\(db,actor\.account\)/);
 assert.match(identity,/profile_avatar_path,profile_avatar_url,updated_at/);
});
