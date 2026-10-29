import test from "node:test";
import assert from "node:assert/strict";
import {isStaff,canModifyRole,canSanction,validateBanInput,validateIp,safeSearch,classifyPlayerProfile,AdminError}
 from "../api/_lib/adminPolicy.js";

test("staff role is restricted to the database's exact ADMIN and DEVELOPER role identifiers",()=>{
 assert.equal(isStaff("DEVELOPER"),true);
 assert.equal(isStaff("ADMIN"),true);
 for(const role of ["PUP_MEMBER","GUEST","admin",null,undefined])assert.equal(isStaff(role),false);
});
test("only a developer may change roles; no self-promotion or self-demotion",()=>{
 assert.equal(canModifyRole("DEVELOPER","ADMIN","a","b"),true);
 assert.equal(canModifyRole("DEVELOPER","DEVELOPER","a","b"),true);
 assert.equal(canModifyRole("ADMIN","DEVELOPER","a","b"),false);
 assert.equal(canModifyRole("DEVELOPER","ADMIN","a","a"),false);
 assert.equal(canModifyRole("DEVELOPER","OWNER","a","b"),false);
});
test("admins cannot ban other staff or themselves; developers can ban other staff",()=>{
 assert.equal(canSanction("ADMIN","PUP_MEMBER","a","b"),true);
 assert.equal(canSanction("ADMIN","DEVELOPER","a","b"),false);
 assert.equal(canSanction("ADMIN","ADMIN","a","b"),false);
 assert.equal(canSanction("DEVELOPER","ADMIN","a","b"),true);
 assert.equal(canSanction("DEVELOPER","ADMIN","a","a"),false);
 assert.equal(canSanction("GUEST","PUP_MEMBER","a","b"),false);
});
test("ban reason and expiry are validated",()=>{
 assert.throws(()=>validateBanInput({reason:"x"}),AdminError);
 assert.throws(()=>validateBanInput({reason:"bad",expiresAt:"invalid"}),AdminError);
 const valid=validateBanInput({reason:"Repeated abuse"});
 assert.equal(valid.expiresAt,null);
 assert.equal(valid.reason,"Repeated abuse");
});
test("IP validation and search-length boundaries",()=>{
 assert.equal(validateIp("203.0.113.2"),"203.0.113.2");
 assert.equal(validateIp("2001:db8::1"),"2001:db8::1");
 assert.throws(()=>validateIp("not-an-ip"),AdminError);
 assert.equal(safeSearch("  USER  "),"user");
 assert.equal(safeSearch("x".repeat(999)).length,80);
});

test("admin user classification uses Pup Account association, not the localplayer name",()=>{
 const ids=new Map([["player-bound-to-real-account",{id:"account-1"}]]);
 assert.equal(classifyPlayerProfile("player-bound-to-real-account",ids),"registered");
 assert.equal(classifyPlayerProfile("other-localplayer",ids),"local");
 assert.equal(classifyPlayerProfile("unlinked-max-puppy4",ids),"local");
});
