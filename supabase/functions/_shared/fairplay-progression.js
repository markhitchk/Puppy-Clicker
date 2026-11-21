// Validate only server-generated tap and care transitions. An invalid transition
// is a server integrity error, not proof of player misconduct.
export function validateFairplayProgression(before,after,intent,{maxTapReward,maxXp}){
 if(!['tap','care'].includes(intent))return [];
 const values=s=>s?.stores?.puppy_clicker_save?.values;
 const a=values(before),b=values(after);
 if(!a||!b)return ['INVALID_SAVE_SHAPE'];
 const errors=[];
 const read=(obj,key,fallback=0)=>obj[key]??fallback;
 const valid=n=>Number.isSafeInteger(n)&&n>=0;
 const check=(key,expected,fallback=0)=>{
  const old=read(a,key,fallback),next=read(b,key);
  if(!valid(old)||!valid(next)||!expected(old,next))errors.push(key);
 };
 const one=(old,next)=>next===Math.min(Number.MAX_SAFE_INTEGER,old+1);
 if(intent==='tap'){
  check('total_taps',one);
  check('legitimate_taps_v7',one,read(a,'total_taps'));
  for(const key of ['treats','lifetime_treats'])
   check(key,(old,next)=>next>=old&&next<=Math.min(Number.MAX_SAFE_INTEGER,old+maxTapReward));
  const oldT=read(a,'treats'),oldL=read(a,'lifetime_treats'),newT=read(b,'treats'),newL=read(b,'lifetime_treats');
  if([oldT,oldL,newT,newL].every(valid)&&newT<Number.MAX_SAFE_INTEGER&&newL<Number.MAX_SAFE_INTEGER&&newT-oldT!==newL-oldL)
   errors.push('TAP_REWARD_MISMATCH');
 }else{
  check('total_taps',(old,next)=>next===old);
  check('care_actions_v5',one);
  check('treats',(old,next)=>next<=old);
  check('lifetime_treats',(old,next)=>next===old);
 }
 const oldXp=read(a,'player_xp_v1',read(a,'lifetime_treats'));
 const newXp=read(b,'player_xp_v1');
 const beforeAchievements=new Set(Array.isArray(a.achievement_rewarded_v1)?a.achievement_rewarded_v1:[]);
 const afterAchievements=new Set(Array.isArray(b.achievement_rewarded_v1)?b.achievement_rewarded_v1:[]);
 const newAchievements=[...afterAchievements].filter(x=>!beforeAchievements.has(x)).length;
 const award=(intent==='tap'?1:5)+Math.min(9,newAchievements)*50;
 if(!valid(oldXp)||!valid(newXp)||newXp!==Math.min(maxXp,Math.min(maxXp,oldXp)+award))errors.push('player_xp_v1');
 return errors;
}
