import test from "node:test";
import assert from "node:assert/strict";
import {normalizeAvatarUrl} from "../api/_lib/avatarUrl.js";
test("accepts HTTPS avatar URLs",()=>{
 assert.equal(normalizeAvatarUrl(" https://cdn.example.com/avatar.png?size=96 "),"https://cdn.example.com/avatar.png?size=96");
 assert.equal(normalizeAvatarUrl(null),null);
});
test("rejects unsafe URLs without making network requests",()=>{
 for(const url of ["http://example.com/a.png","javascript:alert(1)","data:image/png;base64,aaa",
 "https://127.0.0.1/a.png","https://localhost/a.png","https://private.local/a.png",
 "https://user:password@cdn.example.com/a.png","https://cdn.example.com:8443/a.png","",42])
  assert.throws(()=>normalizeAvatarUrl(url));
});
