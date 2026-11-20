import test from "node:test";
import assert from "node:assert/strict";
import {scoreFromVerifiedSave,publicLeaderboard,publicUnifiedLeaderboard} from "../api/_lib/leaderboardCore.js";
const save=values=>({save_schema:3,revision:4,save_data:{stores:{puppy_clicker_save:{values}}}});
test("leaderboard reads only validated cloud-save fields",()=>{
 assert.equal(scoreFromVerifiedSave(save({lifetime_treats:420,player_xp_v1:250000,unlocked_puppies:["v1_classic","v1_classic","v2_moon"]}),"treats"),420);
 assert.equal(scoreFromVerifiedSave(save({player_xp_v1:250000}),"xp"),250000);
 assert.equal(scoreFromVerifiedSave(save({unlocked_puppies:["a","a","b"]}),"puppies"),2);
 assert.equal(scoreFromVerifiedSave(save({lifetime_treats:"900000"}),"treats"),null);
 assert.equal(scoreFromVerifiedSave(save({player_xp_v1:250001}),"xp"),null);
 assert.equal(scoreFromVerifiedSave({save_data:{}},"treats"),null);
});
test("score ties share rank and private account IDs never reach response",()=>{
 const rows=[{key:"a",username:"a",displayName:"A",score:12},{key:"b",username:"b",displayName:"B",score:12},{key:"c",username:"c",displayName:"C",score:2}];
 const out=publicLeaderboard(rows,"c",2);
 assert.deepEqual(out.top.map(x=>x.rank),[1,1]);
 assert.equal(out.self.rank,3);
 assert.equal(JSON.stringify(out).includes("internalKey"),false);
 assert.equal(JSON.stringify(out).includes('"key"'),false);
});

test("unified leaderboard keeps all three scores while changing rank order",()=>{
 const rows=[{key:"private-a",username:"a",displayName:"A",scores:{treats:12,xp:1,puppies:2}},
 {key:"private-b",username:"b",displayName:"B",scores:{treats:2,xp:9,puppies:3}},
 {key:"private-c",username:"c",displayName:"C",scores:{treats:6,xp:null,puppies:1}}];
 const out=publicUnifiedLeaderboard(rows,"private-a","xp");
 assert.deepEqual(out.top.map(r=>r.username),["b","a"]);
 assert.deepEqual(out.top[0].scores,{treats:2,xp:9,puppies:3});
 assert.equal(out.self.rank,2);
 assert.equal(publicUnifiedLeaderboard(rows,"private-a","treats").top[0].username,"a");
 assert.ok(!JSON.stringify(out).includes("private-"));
});
