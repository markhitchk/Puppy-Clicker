// Homepage-only sample game. The state is held in React memory and is NEVER
// linked to Supabase, a Pup Account, browser storage, or /play cloud progress.
import roster from "./data/roster.js";
import {UPGRADES,freshGame,tap,purchase,care,switchPuppy} from "./native/src/engine/game.js";

export const HOME_DEMO_PUPPY_IDS=["classic","golden","poodle","spotty"];
export const HOME_DEMO_PUPPIES=roster.filter(p=>HOME_DEMO_PUPPY_IDS.includes(p.id));
export const HOME_DEMO_UPGRADE=UPGRADES.find(u=>u.id==="better_treats");
export const HOME_DEMO_GOAL=25;

export function createHomePlayDemo(){
 return {
  ...freshGame(),
  puppyName:"Buddy",
  puppyStyle:"classic",
  unlockedPuppies:[...HOME_DEMO_PUPPY_IDS],
  treats:20,
  lifetimeTreats:20,
  bones:1,
  energy:80,
  happiness:86,
  fullness:92,
  cleanliness:95,
  bond:25,
 };
}

export function reduceHomePlayDemo(state,action){
 if(action.type==="reset")return createHomePlayDemo();
 const next=structuredClone(state);
 switch(action.type){
  case "tap":
   // Use the real game's tap rules without allowing a sample ticket drop.
   tap(next,action.now,()=>0.5);
   break;
  case "upgrade":
   purchase(next,HOME_DEMO_UPGRADE);
   break;
  case "rest":
   care(next,"rest");
   break;
  case "switch":
   if(HOME_DEMO_PUPPY_IDS.includes(action.id))switchPuppy(next,action.id,action.now);
   break;
  default:
   return state;
 }
 return next;
}
