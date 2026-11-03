import {loadWebPreferences,saveWebPreferences,updateWebPreference,withWebPreferences,WEB_PREFERENCE_DEFAULTS} from '../../web/preferences.js';
import {useCallback,useEffect,useMemo,useReducer,useRef,useState} from "react";
import {initialState,transition} from "./reducer.js";
import {freshGame} from "../engine/game.js";
import {projectKotlinCloudSave} from "../production/kotlinCloudPreview.js";
import {fallbackSchedule,parseMonthlySchedule,monthKey,webServerRewardsDate} from "../engine/monthlyRewards.js";
import {useWebAccount} from "../../web/AccountGate.jsx";
import {puppyFunctionError} from '../../web/puppyOAuth.js';
import {queueGameplayIntent,pendingGameplayIntents,acknowledgeGameplayIntent} from './gameplayOutbox.js';
import {projectPendingTapDisplay} from './optimisticTaps.js';

// The browser is now a Pup Account companion, not a separate economy.
// Never read or write puppy_web_saves, never forge a PupEye signed envelope.
const LIVE_ACTIONS=new Set([
 "casinoRecoverLegacy","tap","care","purchase","ticket","accessory","equip","exchange","skill",
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
const functionError=puppyFunctionError;
export function useGame(){
 const {user,client,pupAccount}=useWebAccount();
 const [state,dispatch]=useReducer(transition,undefined,()=>({...initialState(),ready:false,notice:""}));
 const [syncStatus,setSyncStatus]=useState({state:"LOADING",revision:null,errorCode:null});
 const [cloudState,setCloudState]=useState("LOADING");
 const [pendingActions,setPendingActions]=useState(0);
 const [queuedTaps,setQueuedTaps]=useState(0);
 const preferences=useRef(null);
 if(!preferences.current)preferences.current=loadWebPreferences();
 const revision=useRef(0),loaded=useRef(false),generation=useRef(0);
 const pending=useRef(0),queue=useRef(Promise.resolve()),inFlight=useRef(new Set());
 const draining=useRef(false),drainRef=useRef(null),retryTimer=useRef(null),retryAttempt=useRef(0),drainAgain=useRef(false);
 const latest=useRef(state);latest.current=state;
 const reload=useCallback(async()=>{
  if(pending.current>0||draining.current)return false;
  const request=++generation.current;
  setSyncStatus(old=>({...old,state:"LOADING",errorCode:null}));
  try{
   const {data,error}=await client.functions.invoke("pup-web-auth",{body:{action:"cloud-save-read"},timeout:15000});
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
   setCloudState("LIVE_SYNCED");
   setSyncStatus({state:"READY",revision:revision.current,errorCode:null});
   // Rehydrate any unsent operations before accepting further cloud writes.
   setTimeout(()=>drainRef.current?.(),0);
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
  return()=>{generation.current++;loaded.current=false;clearTimeout(retryTimer.current);};
 },[reload]);
 // A crash-safe outbox is the source of truth for all pending browser actions.
 // Replies with missing receipts are never acknowledged, even after a timeout.
 const refreshForConflict=useCallback(async()=>{
  try{
   const {data,error}=await client.functions.invoke("pup-web-auth",{body:{action:"cloud-save-read"},timeout:15000});
   if(error||!data?.verified||data.account?.id!==pupAccount.id||!data.cloud?.exists)return false;
   revision.current=data.cloud.revision;
   dispatch({type:"hydrate",game:withWebPreferences(
    projectKotlinCloudSave(data.cloud.saveJson,data.account.displayName),preferences.current
   ),now:Date.now(),readOnly:true});
   setCloudState("LIVE_SYNCED");
   return true;
  }catch{return false;}
 },[client,pupAccount.id]);
 const drain=useCallback(async()=>{
  if(draining.current||!loaded.current)return;
  const captured=generation.current,accountId=pupAccount.id;
  draining.current=true;
  try{
   while(loaded.current&&captured===generation.current){
    const entries=await pendingGameplayIntents(accountId);
    setPendingActions(entries.length);
    setQueuedTaps(entries.filter(item=>item.intent?.type==="tap").length);
    for(const item of entries){
     if(item.intent?.type==='gacha'||item.intent?.type==='casinoRecoverLegacy'||
      /^(slots|roulette|plinko|scratch|wheel|blackjack)/.test(item.intent?.type||''))
      inFlight.current.add(item.intent.type);
    }
    const op=entries[0];
    if(!op){
     retryAttempt.current=0;
     setSyncStatus({state:"SAVED",revision:revision.current,errorCode:null});
     break;
    }
    if(typeof navigator!=="undefined"&&navigator.onLine===false){
     setSyncStatus({state:"QUEUED_OFFLINE",revision:revision.current,errorCode:null});
     break;
    }
    setSyncStatus({state:"SAVING",revision:revision.current,errorCode:null});
    try{
     const {data,error}=await client.functions.invoke("pup-web-auth",{
      body:{action:"gameplay",operationId:op.id,expectedRevision:revision.current,intent:op.intent},timeout:15000
     });
     if(error||!data?.saved||!data.cloud?.exists||data.operationId!==op.id)
      throw new Error(error?await functionError(error):"SAVE_RECEIPT_MISSING");
     // The Edge Function returns a committed database receipt, also on retries.
     await acknowledgeGameplayIntent(accountId,op.id);
     inFlight.current.delete(op.intent.type);
     retryAttempt.current=0;
     revision.current=data.cloud.revision;
     try{
      const game=projectKotlinCloudSave(data.cloud.saveJson,pupAccount?.displayName||pupAccount?.username);
      dispatch({type:"hydrate",game:withWebPreferences(game,preferences.current),now:Date.now(),readOnly:true});
      setCloudState("LIVE_SYNCED");
     }catch{
      setSyncStatus({state:"SAVED_DISPLAY_ERROR",revision:revision.current,
       errorCode:"SAVED_BUT_DISPLAY_REFRESH_FAILED"});
     }
     // Respect the server's 65ms fair-play spacing, without discarding queued taps.
     if(op.intent.type==="tap")await new Promise(resolve=>setTimeout(resolve,90));
    }catch(error){
     const code=String(error?.message||"SAVE_RESULT_UNKNOWN");
     if(code==="CLOUD_SAVE_CONFLICT"){
      if(await refreshForConflict())continue;
     }
     const rejected=new Set([
      "PUP_GAMEPLAY_REJECTED","PUP_GAMEPLAY_ACTION_INVALID",
      "PUP_OPERATION_ID_INVALID","PUP_OPERATION_ID_REUSED",
      "GACHA_INSUFFICIENT_TREATS","GACHA_INSUFFICIENT_TICKET",
      "NOT_ENOUGH_CASINO_CHIPS","BLACKJACK_INSUFFICIENT_CHIPS",
      "CASINO_ROUND_ALREADY_ACTIVE","CASINO_ROUND_NOT_FOUND",
      "BLACKJACK_ROUND_NOT_FOUND","CARE_ACTION_UNAVAILABLE",
      "INVALID_WAGER","BLACKJACK_INVALID_WAGER",
      "PUP_CASINO_ANDROID_ROUND_PENDING","CLOUD_SAVE_REQUIRED",
      "PUP_ACCOUNT_BLOCKED","PUP_ACCOUNT_LEGAL_REQUIRED",
      "PUP_OWNER_DEVICE_UNAVAILABLE"
     ]);
     if(rejected.has(code)){
      // A definitive gameplay rejection is visible, never called 'saved'.
      await acknowledgeGameplayIntent(accountId,op.id);
      inFlight.current.delete(op.intent.type);
      setSyncStatus({state:"REJECTED",revision:revision.current,errorCode:code});
      dispatch({type:"webActionFailed",message:gameplayMessage(code)});
      continue;
     }
     retryAttempt.current=Math.min(7,retryAttempt.current+1);
     const delay=code==="PUP_TAP_RATE_LIMIT"?250:
      code==="PUPEYE_WEB_RATE_LIMIT"?4000:
      Math.min(30000,500*2**retryAttempt.current)+Math.floor(Math.random()*250);
     setSyncStatus({state:"RETRYING",revision:revision.current,errorCode:null});
     clearTimeout(retryTimer.current);
     retryTimer.current=setTimeout(()=>drainRef.current?.(),delay);
     break;
    }
   }
  }catch(error){
   const code=String(error?.message||"PUP_LOCAL_CACHE_UNAVAILABLE");
   setSyncStatus({state:"BLOCKED",revision:revision.current,errorCode:code});
  }finally{
   draining.current=false;
   if(drainAgain.current){
    drainAgain.current=false;
    setTimeout(()=>drainRef.current?.(),0);
   }
  }
 },[client,pupAccount.id,pupAccount?.displayName,pupAccount?.username,refreshForConflict]);
 drainRef.current=drain;
 useEffect(()=>{
  const wake=()=>{if(document.visibilityState==="visible")void drainRef.current?.();};
  const online=()=>void drainRef.current?.();
  window.addEventListener("online",online);
  window.addEventListener("focus",wake);
  document.addEventListener("visibilitychange",wake);
  void drain();
  return()=>{window.removeEventListener("online",online);
   window.removeEventListener("focus",wake);
   document.removeEventListener("visibilitychange",wake);};
 },[drain]);
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
  if(!LIVE_ACTIONS.has(action.type)){dispatch({type:"webActionBlocked"});return;}
  if(!loaded.current||revision.current<1){
   setSyncStatus(old=>({...old,state:"BLOCKED",errorCode:"CLOUD_SAVE_REQUIRED"}));
   return;
  }
  const intent=normalizeIntent(action);
  const exclusive=action.type==='gacha'||action.type==='casinoRecoverLegacy'||
   /^(slots|roulette|plinko|scratch|wheel|blackjack)/.test(action.type);
  if(exclusive&&inFlight.current.has(action.type))return;
  if(exclusive)inFlight.current.add(action.type);
  // Maintain enqueue order when several controls are tapped in the same tick.
  pending.current++;
  setSyncStatus(old=>({...old,state:"QUEUED",errorCode:null}));
  queue.current=queue.current.catch(()=>{}).then(async()=>{
   await queueGameplayIntent(pupAccount.id,intent);
   if(intent.type==="tap")setQueuedTaps(n=>n+1);
   if(draining.current)drainAgain.current=true;
   else void drainRef.current?.();
  }).catch(error=>{
   if(exclusive)inFlight.current.delete(action.type);
   // Never send an action that failed to enter durable storage.
   const code=String(error?.message||"PUP_LOCAL_CACHE_UNAVAILABLE");
   setSyncStatus({state:"BLOCKED",revision:revision.current,errorCode:code});
   dispatch({type:"webActionFailed",message:
    "Your browser could not store this action. Enable site storage or free space; it was not sent."});
  }).finally(()=>{
   pending.current=Math.max(0,pending.current-1);
  });
 },[pupAccount.id,reload]);
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
    const rewardDate=webServerRewardsDate();
    const month=monthKey(rewardDate);
    const response=await fetch("https://raw.githubusercontent.com/markhitchk/pup-clinker/main/assets/rewards/"+month+".json");
    if(!response.ok)return;
    const json=await response.text();
    if(json.length>524288)return;
    const schedule=parseMonthlySchedule(json,rewardDate);
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
 // Predict pending tap rewards for responsiveness; authoritative values only
 // come from the acknowledged server save and can correct this prediction.
 const gameForDisplay=useMemo(()=>{
  if(!queuedTaps)return state.game;
  try{
   const n=Math.min(queuedTaps,80),now=Date.now();
   return projectPendingTapDisplay(state.game,
    Array.from({length:n},(_,i)=>({at:now-(n-i-1)*70})));
  }catch{return state.game;}
 },[state.game,queuedTaps]);
 const account={status:"VERIFIED",username:pupAccount?.username,
  displayName:pupAccount?.displayName||pupAccount?.username,
  discordUserId:pupAccount?.discordUserId||null,
  id:pupAccount?.id,authUserId:user.id,gameplayWritable:loaded.current};
 return {state,gameForDisplay,queuedTaps,act,account,cloudState,
  gameplayBusy:pendingActions>queuedTaps,
  startupError:syncStatus.errorCode?{code:syncStatus.errorCode}:null,syncStatus,
  refreshAccount:reload,updateAccountName};
}

function gameplayMessage(code){
 return ({
  PUP_CASINO_RECOVERY_UNAVAILABLE:'This saved round cannot be recovered here. Finish it in the registered Android app, then refresh.',
  PUP_CASINO_ANDROID_ROUND_PENDING:'Finish your saved Casino round in the registered Android app, let it sync, then refresh here. Your wager has been preserved.',
  GACHA_INSUFFICIENT_TREATS:'You need 2,500 Treats for a capsule. Refresh if your balance changed on Android.',
  GACHA_INSUFFICIENT_TICKET:'You need one Common Ticket for a capsule. Refresh to check your current inventory.',
  NOT_ENOUGH_CASINO_CHIPS:'Not enough Casino Chips. Choose a smaller wager or exchange Treats.',
  BLACKJACK_INSUFFICIENT_CHIPS:'Not enough Casino Chips for this Blackjack wager.',
  CASINO_ROUND_ALREADY_ACTIVE:'Finish your current Casino round before starting another.',
  CLOUD_SAVE_CONFLICT:'Your progress changed on another device. Refreshing your cloud save; check the current result before trying again.',
  PUP_OWNER_DEVICE_UNAVAILABLE:'Your Android PupEye installation could not be verified. Open the registered Android app or use Account recovery.',
  CLOUD_SAVE_REQUIRED:'Open Puppy Clicker on Android and upload its cloud save before playing here.'
 })[code]||'The action could not complete. Refresh your cloud progress and check the saved result before trying again.';
}
