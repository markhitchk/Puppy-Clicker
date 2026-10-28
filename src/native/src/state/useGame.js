import {useCallback,useEffect,useReducer,useRef,useState} from "react";
import {initialState,transition} from "./reducer.js";
import {freshGame,sanitizeGame} from "../engine/game.js";
import {fallbackSchedule,parseMonthlySchedule,monthKey} from "../engine/monthlyRewards.js";
import {useWebAccount} from "../../web/AccountGate.jsx";

// Uses the REAL Android/React Native reducer and screens. Browser auth does
// not imply PupEye authority: the website's existing RLS-backed save remains
// independent from signed native Pup Account progression.
const freshForAccount=user=>{
 const game=freshGame();
 game.onboardingComplete=true;
 game.onboardingStep=5;
 game.guestName=String(user.user_metadata?.full_name||user.user_metadata?.name||user.email?.split("@")[0]||"Puppy Player").slice(0,24);
 return game;
};
const transient=new Set(["dismiss","comboTimeout","monthlySchedule","foregroundCareTick"]);
const cleanInitial=()=>({...initialState(),notice:"",ready:false,monthlySchedule:fallbackSchedule()});
export function useGame(){
 const {user,client,pupAccount}=useWebAccount();
 const [state,dispatch]=useReducer(transition,undefined,cleanInitial);
 const [syncStatus,setSyncStatus]=useState({state:"LOADING",revision:null,errorCode:null});
 const [change,setChange]=useState(0);
 const base=useRef(null),revision=useRef(0),updating=useRef(Promise.resolve());
 const latest=useRef(state),syncing=useRef(false),blocked=useRef(false),loaded=useRef(false),generation=useRef(0);
 latest.current=state;
 const reload=useCallback(async()=>{
  const index=++generation.current;
  blocked.current=true;loaded.current=false;
  setSyncStatus({state:"LOADING",revision:revision.current,errorCode:null});
  try{
   const {data,error}=await client.from("puppy_web_saves")
    .select("revision,save_data").eq("auth_user_id",user.id).maybeSingle();
   if(error)throw error;
   if(index!==generation.current)return false;
   const original=data?.save_data&&typeof data.save_data==="object"?data.save_data:{};
   // Never erase existing V1 web saves, even if they came from the old website.
   if(original.format&&original.format!=="puppy-clicker-web-save")throw Error("SAVE_FORMAT_MISMATCH");
   base.current=original;
   revision.current=Number(data?.revision||0);
   const next=original.nativeGame?sanitizeGame(original.nativeGame):freshForAccount(user);
   if(pupAccount?.displayName&&(!original.nativeGame||next.guestName==="Guest Puppy Fan"))next.guestName=pupAccount.displayName.slice(0,24);
   next.onboardingComplete=true;next.onboardingStep=5;
   dispatch({type:"hydrate",game:next,now:Date.now()});
   dispatch({type:"dismiss"});
   loaded.current=true;blocked.current=false;
   setSyncStatus({state:"READY",revision:revision.current,errorCode:null});
   return true;
  }catch{
   if(index!==generation.current)return false;
   setSyncStatus({state:"BLOCKED",revision:revision.current,errorCode:"SAVE_LOAD_FAILED"});
   return false;
  }
 },[client,user.id,pupAccount?.displayName]);
 useEffect(()=>{void reload();return()=>{generation.current++;loaded.current=false;blocked.current=true;}},[reload]);
 const act=useCallback(action=>{
  if(!action||!action.type)return;
  if(action.type==="dismiss"||action.type==="monthlySchedule"||action.type==="comboTimeout"){
   dispatch(action);return;
  }
  if(!loaded.current||blocked.current)return;
  if(action.type==="webBirthday"){
   const current=latest.current.game;
   dispatch({type:"hydrate",game:{...current,birthdayMonth:action.month,birthdayDay:action.day},now:Date.now(),readOnly:true});
   setChange(n=>n+1);
   return;
  }
  // Signed account ownership is enforced by Supabase RLS/RPC. This must
  // never be represented as the original Android PupEye-signed economy.
  dispatch(action);
  if(!transient.has(action.type))setChange(n=>n+1);
 },[]);
 const flush=useCallback(snapshot=>{
  const capturedIndex=generation.current;
  const normalized=sanitizeGame(snapshot);
  updating.current=updating.current.catch(()=>{}).then(async()=>{
   if(blocked.current||!loaded.current||generation.current!==capturedIndex)return;
   syncing.current=true;
   setSyncStatus(prev=>({...prev,state:"SAVING",errorCode:null}));
   // Legacy web `save_data.game` is explicitly preserved untouched.
   const payload={...base.current,format:"puppy-clicker-web-save",
     schemaVersion:1,nativeGame:normalized};
   try{
    const {data,error}=await client.rpc("puppy_web_save_commit",{
      p_expected_revision:revision.current,p_save_data:payload
    });
    if(error)throw error;
    if(generation.current!==capturedIndex)return;
    revision.current=Number(data);
    base.current=payload;
    setSyncStatus({state:"SAVED",revision:revision.current,errorCode:null});
   }catch(error){
    blocked.current=true;
    setSyncStatus({state:"BLOCKED",revision:revision.current,
      errorCode:String(error?.message||"SAVE_FAILED").includes("WEB_SAVE_CONFLICT")?"SAVE_CONFLICT":"SAVE_FAILED"});
   }finally{syncing.current=false;}
  });
  return updating.current;
 },[client]);
 useEffect(()=>{
  if(change===0||!state.ready||!loaded.current||blocked.current)return;
  // Gameplay reacts instantly. Backend snapshots are queued in reducer order.
  const timer=setTimeout(()=>{void flush(latest.current.game)},180);
  return()=>clearTimeout(timer);
 },[change,state.game,state.ready,flush]);
 useEffect(()=>{
  if(!loaded.current)return;
  const onHidden=()=>{if(document.visibilityState==="hidden"&&state.ready)void flush(latest.current.game)};
  document.addEventListener("visibilitychange",onHidden);
  return()=>document.removeEventListener("visibilitychange",onHidden);
 },[flush,state.ready]);
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
  const next=String(name||"").trim().slice(0,24);
  if(next.length<2)throw Error("Display name must be at least 2 characters");
  const {error}=await client.auth.updateUser({data:{full_name:next}});
  if(error)throw error;
  dispatch({type:"hydrate",game:{...latest.current.game,guestName:next},now:Date.now(),readOnly:true});
  setChange(n=>n+1);
  return true;
 },[client,act]);
 const account={status:"WEB_VERIFIED_PUP_ACCOUNT",username:pupAccount?.username,
  displayName:pupAccount?.displayName||pupAccount?.username,
  discordUserId:pupAccount?.discordUserId||null,
  id:pupAccount?.id,authUserId:user.id,gameplayWritable:!blocked.current};
 return {state,gameForDisplay:state.game,act,account,cloudState:syncStatus.state,
  startupError:syncStatus.errorCode?{code:syncStatus.errorCode}:null,syncStatus,
  refreshAccount:reload,updateAccountName};
}
