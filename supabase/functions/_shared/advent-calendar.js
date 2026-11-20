// Shared, fixed 2026 event schedule. Server callers must supply server time.
export const ADVENT_YEAR=2026;
export const ADVENT_START=Date.UTC(ADVENT_YEAR,11,1);
export const ADVENT_END=Date.UTC(ADVENT_YEAR,11,26);
export const ADVENT_CLAIMS_KEY='web_advent_2026_claimed_v1';
const milestones={5:[1000,5,5],10:[1500,8,8],15:[2000,10,10],20:[3000,15,15],24:[4000,20,20],25:[10000,50,50]};
export const ADVENT_REWARDS=Object.freeze(Array.from({length:25},(_,i)=>{
 const day=i+1, [treats,bones,coins]=milestones[day]??[250+day*25,2,2];
 return Object.freeze({day,id:'2026-12-'+String(day).padStart(2,'0'),treats,bones,coins,bonus:day===25});
}));
export function adventDay(id){return ADVENT_REWARDS.find(r=>r.id===id);}
export function adventClaims(raw){
 return Array.isArray(raw)?[...new Set(raw.filter(id=>typeof id==='string'&&adventDay(id)))]:[];
}
export function adventPhase(now){
 return now<ADVENT_START?'upcoming':now>=ADVENT_END?'ended':'active';
}
export function adventDoorState(reward,claims,now){
 if(claims.includes(reward.id))return 'claimed';
 const date=Date.UTC(ADVENT_YEAR,11,reward.day);
 if(now>=ADVENT_END)return 'expired';
 if(now<date)return 'locked';
 return 'available';
}
export function requireAdventReward(id,claims,now){
 const reward=adventDay(id);
 if(!reward)throw Error('ADVENT_DAY_INVALID');
 if(claims.includes(id))throw Error('ADVENT_ALREADY_CLAIMED');
 if(adventPhase(now)!=='active')throw Error('ADVENT_CLOSED');
 if(adventDoorState(reward,claims,now)!=='available')throw Error('ADVENT_DAY_LOCKED');
 return reward;
}
