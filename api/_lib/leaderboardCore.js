// Minimal server-owned public projection. Never serialize a raw cloud save.
export const LEADERBOARD_METRICS=Object.freeze(["treats","xp","puppies"]);
const MAX_TREATS=1_000_000_000_000_000;
export function scoreFromVerifiedSave(save,metric){
 if(!LEADERBOARD_METRICS.includes(metric))return null;
 if(!save||typeof save!=="object"||save.save_schema==null||!Number.isInteger(Number(save.revision))||Number(save.revision)<0)return null;
 const values=save.save_data?.stores?.puppy_clicker_save?.values;
 if(!values||typeof values!=="object"||Array.isArray(values))return null;
 if(metric==="puppies"){
  const ids=values.unlocked_puppies;
  if(!Array.isArray(ids)||ids.length>500||ids.some(id=>typeof id!=="string"||id.length>100))return null;
  return new Set(ids).size;
 }
 const raw=metric==="xp"?values.player_xp_v1:values.lifetime_treats;
 if(typeof raw!=="number"||!Number.isSafeInteger(raw)||raw<0||raw>(metric==="xp"?250000:MAX_TREATS))return null;
 return raw;
}
export function rankEligible(rows){
 const sorted=[...rows].sort((a,b)=>b.score-a.score||a.key.localeCompare(b.key));
 let last=null,lastRank=0;
 return sorted.map((row,i)=>{
  if(last!==row.score){last=row.score;lastRank=i+1;}
  return {rank:lastRank,username:row.username,displayName:row.displayName,score:row.score,internalKey:row.key};
 });
}
export function publicLeaderboard(rows,selfKey,limit=100){
 const ranked=rankEligible(rows);
 const publicRow=({rank,username,displayName,score})=>({rank,username,displayName,score});
 return {top:ranked.slice(0,limit).map(publicRow),
  self:ranked.find(row=>row.internalKey===selfKey)?publicRow(ranked.find(row=>row.internalKey===selfKey)):null,
  total:ranked.length};
}
