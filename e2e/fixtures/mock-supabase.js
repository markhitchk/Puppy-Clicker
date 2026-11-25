import roster from '../../src/data/roster.js';
// E2E-only Supabase shim. Production imports the real authenticated Supabase client.
// Emulates the live Kotlin-format Pup Account row, not the legacy web save RPC.
const user={id:"e2e-puppy-clicker-user",email:"tester@example.invalid",user_metadata:{full_name:"Test Player"}};
const pup={id:"6c7998ba-e1cd-4dbb-98f6-001022334455",username:"TestPlayer",displayName:"Test Player",discordUserId:"1547290000000000001"};
const key="puppy_test_authoritative_kotlin_save_v1";
const publishedCreations=()=>{try{return JSON.parse(localStorage.getItem("e2e_creator_roster")||"[]");}catch{return [];}};
const testSession=()=>signedOut?null:{user,access_token:"e2e-only-token"};
let signedOut=new URLSearchParams(window.location.search).has("signedout");
const listeners=new Set();
const emit=event=>{for(const listener of listeners)listener(event,testSession())};
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
const cloud=r=>({exists:true,revision:r.revision,updatedAt:r.updatedAt,saveJson:JSON.stringify({...r.saveData,webCompanion:{nativeCasinoPending:!!r.saveData.stores.puppy_clicker_save.values.casino_active_round_v1}})});
const failure=code=>({data:null,error:{context:new Response(JSON.stringify({error:code}),{status:409})}});
const save=r=>localStorage.setItem(key,JSON.stringify(r));
export const client={
 async rpc(name){
  if(name==='pup_creator_roster')return {data:publishedCreations(),error:null};
  if(name==='pup_event_settings_public')return {data:{all_events:!new URLSearchParams(location.search).has('eventsoff'),christmas_2026:!new URLSearchParams(location.search).has('christmasoff'),winter_effects:!new URLSearchParams(location.search).has('winteroff')},error:null};
  if(name!=='pup_rarity_public')throw Error('Unexpected public RPC');
  // Mirror published rarity/acquisition groups rather than making every
  // non-developer puppy Common. Visual rarity/filter tests depend on this.
  const groups={
   uncommon:['cloud','snowball','v2_honey','v2_chestnut'],
   rare:['midnight','v2_frost','v2_onyx','v2_domino','v2_flurry','v2_discord_pup'],
   epic:['aurora','neon_buddy','golden_night','halloween','santa','birthday','v2_rory'],
   legendary:['galaxy','v2_prism','secret_snoot','classic_forever'],
   unobtainable:['dev_pup','v2_dev_pup','v2_harleytg']
  };
  const tier=id=>Object.keys(groups).find(r=>groups[r].includes(id))||'common';
  const acquisition=id=>groups.unobtainable.includes(id)?'developer':
   ['halloween','santa','birthday'].includes(id)?'event':
   ['v2_rory','secret_snoot','classic_forever'].includes(id)?'code':
   id==='v2_discord_pup'?'community':'standard';
  return {data:[...roster.map(p=>({puppy_id:p.id,rarity:tier(p.id),published:true,acquisition:acquisition(p.id)})),...publishedCreations().map(p=>({puppy_id:p.id,rarity:"rare",published:true,acquisition:"community",giftable:true,tradeable:false}))]};
 },
 auth:{
  onAuthStateChange(listener){listeners.add(listener);queueMicrotask(()=>listener('INITIAL_SESSION',testSession()));return {data:{subscription:{unsubscribe(){listeners.delete(listener)}}}}},
  async getSession(){return{data:{session:testSession()},error:null}},
  async getUser(){return{data:{user:signedOut?null:user},error:null}},
  async verifyOtp({type,token_hash}){if(type!=="magiclink"||token_hash!=="test-puppy-token")return{error:new Error("OTP_INVALID")};signedOut=false;emit('SIGNED_IN');return{data:{user},error:null}},
  async exchangeCodeForSession(code){await new Promise(r=>setTimeout(r,50));if(code==='email-code-invalid')return {error:new Error('EXPIRED')};signedOut=false;emit('PASSWORD_RECOVERY');return {error:null}},
  async setSession({access_token,refresh_token}){if(!access_token||!refresh_token)return{error:new Error("SESSION_INVALID")};signedOut=false;return{data:{user},error:null}},
  async signOut(){signedOut=true;emit('SIGNED_OUT');return{error:null}}
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
  if(body.action==="cloud-save-read"){
   if(new URLSearchParams(location.search).has('nocloud'))return {data:{verified:true,account:pup,cloud:{exists:false}},error:null};
   if(new URLSearchParams(location.search).has('ownerrevoked'))return failure('PUP_OWNER_DEVICE_UNAVAILABLE');
   const response=await fetch('/__e2e/snapshot',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({record:record(),body})});
   const result=await response.json();
   if(!response.ok)return failure(result.error);
   return {data:{...result.receipt,account:pup},error:null};
  }
  if(body.action==="account-update"){
   pup.displayName=body.displayName;return{data:{updated:true,displayName:pup.displayName},error:null};
  }
  if(body.action==="gameplay"){
   if(new URLSearchParams(window.location.search).has('slowgameplay'))await new Promise(resolve=>setTimeout(resolve,1000));
   const r=record();
   if(body.expectedRevision!==r.revision)return failure('CLOUD_SAVE_CONFLICT');
   const v=r.saveData.stores.puppy_clicker_save.values;
   const intent=body.intent||{};
   if(intent.type==='claimFreeTest'){
    const id=intent.id;
    if(!['test_v1_crash_dummy','test_v2_crash_dummy'].includes(id))return failure('FREE_TEST_PUPPY_INVALID');
    if(v.unlocked_puppies.includes(id))return failure('FREE_TEST_PUPPY_ALREADY_OWNED');
    v.unlocked_puppies.push(id);
   }else if(intent.type==="tap"){
    if(v.energy<=10)return{data:null,error:new Error("PUP_NEEDS_REST")};
    v.treats+=2;v.lifetime_treats+=2;v.total_taps+=1;v.legitimate_taps_v7+=1;v.player_xp_v1+=1;
   }else if(intent.type==='rename'&&typeof intent.name==='string'&&intent.name.trim().length<=18){
    v.puppy_name=intent.name.trim();
   }else if(intent.type==="care"&&intent.kind==="rest"){
    v.energy=Math.min(100,v.energy+30);
   }else {
    const response=await fetch('/__e2e/gameplay',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({record:r,body})});
    const result=await response.json();
    if(!response.ok)return failure(result.error);
    save(result.record);return {data:result.receipt,error:null};
   }
   r.revision++;r.updatedAt=new Date().toISOString();save(r);
   return{data:{saved:true,operationId:body.operationId,cloud:cloud(r)},error:null};
  }
  return{data:null,error:new Error("PUP_ACTION_INVALID")};
 }}
};
