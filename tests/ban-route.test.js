import test from "node:test";
import assert from "node:assert/strict";
import {banTargetFromLocation,isBanAccountRoute,banAccountUrl} from "../src/banRoute.js";

test("ban admin URL supports legacy @username and conventional query",()=>{
 assert.equal(banTargetFromLocation({pathname:"/account/bansys/user=",search:"?@test"}),"test");
 assert.equal(banTargetFromLocation({pathname:"/account/bansys/user",search:"?username=Test_02"}),"Test_02");
 assert.equal(banTargetFromLocation({pathname:"/account/bansys/user=",search:"?%40test"}),"test");
 assert.equal(banTargetFromLocation({pathname:"/play",search:"?@test"}),null);
 assert.equal(banTargetFromLocation({pathname:"/account/bansys/user=",search:"?@bad.name"}),"");
 assert.ok(isBanAccountRoute("/account/bansys/user="));
 assert.equal(banAccountUrl("test"),"/account/bansys/user=?@test");
});
