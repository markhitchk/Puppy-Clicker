import test from "node:test";
import assert from "node:assert/strict";
import {scoreFromVerifiedSave,publicLeaderboard} from "../api/_lib/leaderboardCore.js";
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
