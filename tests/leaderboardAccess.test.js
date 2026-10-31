import test from "node:test";
import assert from "node:assert/strict";
import {isLeaderboardActionAllowed,leaderboardParticipation} from "../api/_lib/leaderboardAccess.js";

test("developer accounts can view rankings but cannot opt in",()=>{
 assert.equal(isLeaderboardActionAllowed({reason:"developer",method:"GET"}),true);
 assert.equal(isLeaderboardActionAllowed({reason:"developer",method:"POST"}),false);
 assert.deepEqual(leaderboardParticipation({reason:"developer",optedIn:true,excluded:false}),{canParticipate:false,participating:false});
});
test("ordinary accounts retain opt-in choice",()=>{
 assert.equal(isLeaderboardActionAllowed({reason:null,method:"GET"}),true);
 assert.equal(isLeaderboardActionAllowed({reason:null,method:"POST"}),true);
 assert.deepEqual(leaderboardParticipation({reason:null,optedIn:true,excluded:false}),{canParticipate:true,participating:true});
 assert.deepEqual(leaderboardParticipation({reason:null,optedIn:false,excluded:false}),{canParticipate:true,participating:false});
});
test("banned and inactive accounts remain ineligible for read and write",()=>{
 for(const reason of ["banned","account","player"]){
  assert.equal(isLeaderboardActionAllowed({reason,method:"GET"}),false);
  assert.equal(isLeaderboardActionAllowed({reason,method:"POST"}),false);
 }
});
test("excluded accounts never appear opted in even with an old consent flag",()=>{
 assert.deepEqual(leaderboardParticipation({reason:null,optedIn:true,excluded:true}),{canParticipate:false,participating:false});
});
