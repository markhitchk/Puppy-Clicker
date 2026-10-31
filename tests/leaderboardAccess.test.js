import test from "node:test";
import assert from "node:assert/strict";
import {isLeaderboardActionAllowed,leaderboardParticipation,isRankedAccountEligible} from "../api/_lib/leaderboardAccess.js";

test("developer can explicitly opt into and out of public rankings",()=>{
 assert.equal(isLeaderboardActionAllowed({reason:"developer",method:"GET"}),true);
 assert.equal(isLeaderboardActionAllowed({reason:"developer",method:"POST"}),true);
 assert.deepEqual(leaderboardParticipation({reason:"developer",optedIn:false,excluded:false}),{canParticipate:true,participating:false});
 assert.deepEqual(leaderboardParticipation({reason:"developer",optedIn:true,excluded:false}),{canParticipate:true,participating:true});
});
test("excluded and banned users remain blocked",()=>{
 for(const reason of ["account","player","banned"]){
  assert.equal(isLeaderboardActionAllowed({reason,method:"GET"}),false);
  assert.equal(isLeaderboardActionAllowed({reason,method:"POST"}),false);
 }
 assert.deepEqual(leaderboardParticipation({reason:"developer",optedIn:true,excluded:true}),{canParticipate:false,participating:false});
});
test("eligible ordinary players still opt in only explicitly",()=>{
 assert.equal(isLeaderboardActionAllowed({reason:null,method:"POST"}),true);
 assert.deepEqual(leaderboardParticipation({reason:null,optedIn:false,excluded:false}),{canParticipate:true,participating:false});
 assert.deepEqual(leaderboardParticipation({reason:null,optedIn:true,excluded:false}),{canParticipate:true,participating:true});
});
test("opted-in developer ranks but banned and inactive users do not",()=>{
 const developer={id:"dev",status:"active",player_uuid:"player-dev"};
 const player={status:"active",guild_role:"DEVELOPER"};
 assert.equal(isRankedAccountEligible(developer,player,new Set()),true);
 assert.equal(isRankedAccountEligible(developer,player,new Set(["player-dev"])),false);
 assert.equal(isRankedAccountEligible(developer,{status:"inactive",guild_role:"DEVELOPER"},new Set()),false);
 assert.equal(isRankedAccountEligible({...developer,status:"banned"},player,new Set()),false);
});
