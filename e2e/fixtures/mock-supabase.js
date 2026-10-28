// E2E-only Supabase shim. Production imports the real authenticated Supabase client.
// Emulates the live Kotlin-format Pup Account row, not the legacy web save RPC.
const user={id:"e2e-puppy-clicker-user",email:"tester@example.invalid",user_metadata:{full_name:"Test Player"}};
const pup={id:"e2e-pup-account-id",username:"TestPlayer",displayName:"Test Player",discordUserId:"1547290000000000001"};
const key="puppy_test_authoritative_kotlin_save_v1";
let signedOut=new URLSearchParams(window.location.search).has("signedout");
const fresh=()=>({revision:1,updatedAt:new Date().toISOString(),saveData:{
 format:"puppy-clicker-cloud-save",version:1,savedAtEpochMs:Date.now(),stores:{
  puppy_clicker_save:{values:{
   puppy_name:"Buddy",puppy_style:"classic",
   unlocked_puppies:["classic","golden","poodle","spotty"],
   treats:0,lifetime_treats:0,bones_v7:0,pup_coins_v7:0,casino_chips_v7:0,
   total_taps:0,legitimate_taps_v7:0,energy:100,fullness:100,
   happiness:100,cleanliness_v5:100,bond_v5:10,player_xp_v1:0
  },types:{}}
 }
}});
const record=()=>{try{return JSON.parse(localStorage.getItem(key)||"null")||fresh()}catch{return fresh()}};
const cloud=r=>({exists:true,revision:r.revision,updatedAt:r.updatedAt,saveJson:JSON.stringify(r.saveData)});
const save=r=>localStorage.setItem(key,JSON.stringify(r));
export const client={
 auth:{
  onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}},
  async getSession(){return{data:{session:signedOut?null:{user}},error:null}},
  async getUser(){return{data:{user:signedOut?null:user},error:null}},
  async verifyOtp({type,token_hash}){if(type!=="magiclink"||token_hash!=="test-puppy-token")return{error:new Error("OTP_INVALID")};signedOut=false;return{data:{user},error:null}},
  async setSession({access_token,refresh_token}){if(!access_token||!refresh_token)return{error:new Error("SESSION_INVALID")};signedOut=false;return{data:{user},error:null}},
  async signOut(){signedOut=true;return{error:null}}
 },
 functions:{async invoke(name,{body}){
  if(signedOut)return{data:null,error:new Error("PUP_ACCOUNT_SESSION_REQUIRED")};
  if(name==="pup-exchange"){
   if(body.operation==="profile")return{data:{
    profile:{username:pup.username,friendCode:"PUP-TEST-WEBB-GAME",canGiftAll:false,canGiftDirect:false},
    connections:[],offers:[],policies:[]
   },error:null};
   return{data:null,error:new Error("EXCHANGE_ACTION_INVALID")};
  }
  if(name!=="pup-web-auth")return{data:null,error:new Error("PUP_ACTION_INVALID")};
  if(body.action==="status")return {data:{verified:true,account:pup},error:null};
  if(body.action==="cloud-save-read")return {data:{verified:true,account:pup,cloud:cloud(record())},error:null};
  if(body.action==="account-update"){
   pup.displayName=body.displayName;return{data:{updated:true,displayName:pup.displayName},error:null};
  }
  if(body.action==="gameplay"){
   if(new URLSearchParams(window.location.search).has('slowgameplay'))await new Promise(resolve=>setTimeout(resolve,1000));
   const r=record();
   if(body.expectedRevision!==r.revision)return{data:null,error:new Error("CLOUD_SAVE_CONFLICT")};
   const v=r.saveData.stores.puppy_clicker_save.values;
   const intent=body.intent||{};
   if(intent.type==="tap"){
    if(v.energy<=10)return{data:null,error:new Error("PUP_NEEDS_REST")};
    v.treats+=2;v.lifetime_treats+=2;v.total_taps+=1;v.legitimate_taps_v7+=1;v.player_xp_v1+=1;
   }else if(intent.type==="care"&&intent.kind==="rest"){
    v.energy=Math.min(100,v.energy+30);
   }else return{data:null,error:new Error("PUP_GAMEPLAY_REJECTED")};
   r.revision++;r.updatedAt=new Date().toISOString();save(r);
   return{data:{saved:true,cloud:cloud(r)},error:null};
  }
  return{data:null,error:new Error("PUP_ACTION_INVALID")};
 }}
};
