import {loadWebPreferences,saveWebPreferences,updateWebPreference,withWebPreferences,WEB_PREFERENCE_DEFAULTS} from '../../web/preferences.js';
import {useCallback,useEffect,useReducer,useRef,useState} from "react";
import {initialState,transition} from "./reducer.js";
import {freshGame} from "../engine/game.js";
import {projectKotlinCloudSave} from "../production/kotlinCloudPreview.js";
import {fallbackSchedule,parseMonthlySchedule,monthKey} from "../engine/monthlyRewards.js";
import {useWebAccount} from "../../web/AccountGate.jsx";

// The browser is now a Pup Account companion, not a separate economy.
// Never read or write puppy_web_saves, never forge a PupEye signed envelope.
const LIVE_ACTIONS=new Set([
 "tap","care","purchase","ticket","accessory","equip","exchange","skill",
 "daily","claimDailyGoal","parkStart","parkClaim","prestige",
 "slotsStart","slotsReveal","rouletteStart","rouletteReveal",
 "plinkoStart","plinkoReveal","scratchStart","scratchReveal",
 "wheelStart","wheelReveal","gacha","switch","rename","favorite",
 "afkStart","afkSettle","afkClaim","afkOpen","afkMarkAllRead","afkClearRead",
 "blackjackStart","blackjackHit","blackjackStand","blackjackDouble","blackjackSplit"
]);
const LOCAL_ACTIONS=new Set([
 "dismiss","dismissGacha","monthlySchedule","comboTimeout","setPreference",
 "resetSettings","checkNotifications","testNotification","markNotificationsRead",
 "clearReadNotifications","openNotification"
]);
const freshView=name=>{
 const game=freshGame();
 game.onboardingComplete=true;game.onboardingStep=5;
 game.guestName=String(name||"Pup Account").slice(0,24);
 return game;
};
const normalizeIntent=action=>Object.fromEntries(
 ["type","kind","id","payment","upgradeId","rarity","name","skill",
 "goalId","amount","wager","bet"].filter(k=>action[k]!==undefined).map(k=>[k,action[k]])
);
async function functionError(error){
 let code="PUP_CLOUD_UNAVAILABLE";
 try{
  const json=await error?.context?.json?.();
  if(typeof json?.error==="string"&&/^[A-Z0-9_]{3,80}$/.test(json.error))code=json.error;
 }catch{}
 return code;
}
export function useGame(){
 const {user,client,pupAccount}=useWebAccount();
 const [state,dispatch]=useReducer(transition,undefined,()=>({...initialState(),ready:false,notice:""}));
 const [syncStatus,setSyncStatus]=useState({state:"LOADING",revision:null,errorCode:null});
 const [cloudState,setCloudState]=useState("LOADING");
 const [pendingActions,setPendingActions]=useState(0);
 const preferences=useRef(null);
 if(!preferences.current)preferences.current=loadWebPreferences();
 const revision=useRef(0),loaded=useRef(false),generation=useRef(0);
 const pending=useRef(0),queue=useRef(Promise.resolve());
 const latest=useRef(state);latest.current=state;
 const reload=useCallback(async()=>{
  if(pending.current>0)return false;
  const request=++generation.current;
  setSyncStatus(old=>({...old,state:"LOADING",errorCode:null}));
  try{
   const {data,error}=await client.functions.invoke("pup-web-auth",{body:{action:"cloud-save-read"}});
   if(error||!data?.verified||data.account?.id!==pupAccount.id)
    throw new Error(error?await functionError(error):"PUP_ACCOUNT_VERIFICATION_FAILED");
   if(request!==generation.current)return false;
   if(!data.cloud?.exists){
    // Never seed a blank website save over a pre-existing Kotlin player.
    loaded.current=false;revision.current=0;
    dispatch({type:"hydrate",game:withWebPreferences(freshView(data.account.displayName),preferences.current),now:Date.now(),readOnly:true});
    setCloudState("NO_CLOUD_SAVE");
    setSyncStatus({state:"BLOCKED",revision:0,errorCode:"CLOUD_SAVE_REQUIRED"});
    return false;
   }
   const game=projectKotlinCloudSave(data.cloud.saveJson,data.account.displayName);
   revision.current=data.cloud.revision;
   loaded.current=true;
   dispatch({type:"hydrate",game:withWebPreferences(game,preferences.current),now:Date.now(),readOnly:true});
   dispatch({type:"dismiss"});
   setCloudState("LIVE_SYNCED");
   setSyncStatus({state:"READY",revision:revision.current,errorCode:null});
   return true;
  }catch(error){
   if(request!==generation.current)return false;
   const message=String(error?.message||"CLOUD_LOAD_FAILED");
   setSyncStatus({state:loaded.current?"RECONNECTING":"BLOCKED",
    revision:revision.current,errorCode:/^CLOUD_|^PUP_/.test(message)?message:"CLOUD_LOAD_FAILED"});
   if(!loaded.current){setCloudState("CONNECTION_ERROR");}
   return false;
  }
 },[client,pupAccount.id]);
 useEffect(()=>{
  void reload();
  return()=>{generation.current++;loaded.current=false;};
 },[reload]);
 const act=useCallback(action=>{
  if(!action?.type)return;
  if(action.type==='setPreference'){
   const next=updateWebPreference(preferences.current,action.name,action.value);
   if(next===preferences.current)return;
   preferences.current=next;saveWebPreferences(next);dispatch(action);return;
  }
  if(action.type==='resetSettings'){
   preferences.current={...WEB_PREFERENCE_DEFAULTS};saveWebPreferences(preferences.current);
   dispatch(action);
   for(const [name,value] of Object.entries(preferences.current))dispatch({type:'setPreference',name,value});
   return;
  }
  if(LOCAL_ACTIONS.has(action.type)){dispatch(action);return;}
  if(action.type==="resume"||action.type==="rollDailyDay"){
   if(pending.current===0)void reload();
   return;
  }
  if(!LIVE_ACTIONS.has(action.type)){
   // Unsupported actions fail closed; client-side reducers cannot mint money.
   dispatch({type:"webActionBlocked"});
   return;
  }
  if(!loaded.current||revision.current<1){
   setSyncStatus(old=>({...old,state:"BLOCKED",errorCode:"CLOUD_SAVE_REQUIRED"}));
   return;
  }
  const intent=normalizeIntent(action);
  const captured=generation.current;
  pending.current++;setPendingActions(pending.current);
  setSyncStatus(old=>({...old,state:"SAVING",errorCode:null}));
  queue.current=queue.current.catch(()=>{}).then(async()=>{
   if(!loaded.current||captured!==generation.current)return;
   const {data,error}=await client.functions.invoke("pup-web-auth",{
    body:{action:"gameplay",expectedRevision:revision.current,intent}
   });
   if(error||!data?.saved||!data.cloud?.exists){
    const code=error?await functionError(error):"SAVE_RECEIPT_MISSING";
    throw new Error(code);
   }
   // The server has committed a single authoritative Kotlin revision.
   // A display projection failure must never cause an automatic economy retry.
   revision.current=data.cloud.revision;
   setSyncStatus({state:"SAVED",revision:revision.current,errorCode:null});
   try{
    const game=projectKotlinCloudSave(data.cloud.saveJson,pupAccount?.displayName||pupAccount?.username);
    dispatch({type:"hydrate",game:withWebPreferences(game,preferences.current),now:Date.now(),readOnly:true});
    setCloudState("LIVE_SYNCED");
   }catch{
    setSyncStatus({state:"SAVED_DISPLAY_ERROR",revision:revision.current,errorCode:"SAVED_BUT_DISPLAY_REFRESH_FAILED"});
   }
  }).catch(error=>{
   const code=String(error?.message||"SAVE_RESULT_UNKNOWN");
   // Never automatically replay an ambiguous write, including timeouts.
   // On conflict, require a fresh authenticated cloud snapshot.
   if(code==="CLOUD_SAVE_CONFLICT"||code==="SAVE_RESULT_UNKNOWN"||code==="PUP_CLOUD_UNAVAILABLE"){
    loaded.current=false;
    setCloudState("CONNECTION_ERROR");
   }
   setSyncStatus({state:"BLOCKED",revision:revision.current,errorCode:code});
  }).finally(()=>{
   pending.current=Math.max(0,pending.current-1);setPendingActions(pending.current);
   if(pending.current===0&&!loaded.current)void reload();
  });
 },[client,reload,pupAccount?.displayName,pupAccount?.username]);
 useEffect(()=>{
  const refresh=()=>{if(pending.current===0&&document.visibilityState==="visible")void reload();};
  const timer=setInterval(refresh,15000);
  window.addEventListener("focus",refresh);
  document.addEventListener("visibilitychange",refresh);
  return()=>{clearInterval(timer);window.removeEventListener("focus",refresh);
   document.removeEventListener("visibilitychange",refresh)};
 },[reload]);
 useEffect(()=>{
  let alive=true;
  const update=async()=>{
   try{
    const month=monthKey(new Date());
    const response=await fetch("https://raw.githubusercontent.com/markhitchk/pup-clinker/main/assets/rewards/"+month+".json");
    if(!response.ok)return;
    const json=await response.text();
    if(json.length>524288)return;
    const schedule=parseMonthlySchedule(json,new Date());
    if(alive&&schedule)dispatch({type:"monthlySchedule",schedule});
   }catch{}
  };
  void update();
  const timer=setInterval(()=>void update(),15*60*1000);
  return()=>{alive=false;clearInterval(timer)};
 },[]);
 const updateAccountName=useCallback(async name=>{
  const displayName=String(name||"").trim().slice(0,24);
  if(displayName.length<2)throw Error("Display name must be at least 2 characters");
  const {data,error}=await client.functions.invoke("pup-web-auth",{body:{action:"account-update",displayName}});
  if(error||!data?.updated)throw Error("PUP_ACCOUNT_UPDATE_FAILED");
  dispatch({type:"hydrate",game:withWebPreferences({...latest.current.game,guestName:data.displayName},preferences.current),now:Date.now(),readOnly:true});
  return true;
 },[client]);
 const account={status:"VERIFIED",username:pupAccount?.username,
  displayName:pupAccount?.displayName||pupAccount?.username,
  discordUserId:pupAccount?.discordUserId||null,
  id:pupAccount?.id,authUserId:user.id,gameplayWritable:loaded.current};
 return {state,gameForDisplay:state.game,act,account,cloudState,
  gameplayBusy:pendingActions>0,
  startupError:syncStatus.errorCode?{code:syncStatus.errorCode}:null,syncStatus,
  refreshAccount:reload,updateAccountName};
}
