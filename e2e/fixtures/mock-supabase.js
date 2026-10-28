// E2E-only browser shim. Production imports the REAL Supabase client instead.
const user={id:"e2e-puppy-clicker-user",email:"tester@example.invalid",
 user_metadata:{full_name:"Test Player"}};
const pup={id:"e2e-pup-account-id",username:"TestPlayer",displayName:"Test Player",discordUserId:"1547290000000000001"};
const key="puppy_test_web_save_v1";
let signedOut=new URLSearchParams(window.location.search).has("signedout");
const record=()=>{try{return JSON.parse(localStorage.getItem(key)||"null")}catch{return null}};
export const client={
 auth:{
  onAuthStateChange(){return{data:{subscription:{unsubscribe(){}}}}},
  async getSession(){return{data:{session:signedOut?null:{user}},error:null}},
  async getUser(){return{data:{user:signedOut?null:user},error:null}},
  async verifyOtp({type,token_hash}){if(type!=="magiclink"||token_hash!=="test-puppy-token")return{error:new Error("OTP_INVALID")};signedOut=false;return{data:{user},error:null}},
  async setSession({access_token,refresh_token}){if(!access_token||!refresh_token)return{error:new Error("SESSION_INVALID")};signedOut=false;return{data:{user},error:null}},
  async updateUser(){return{data:{user},error:null}},
  async signOut(){signedOut=true;return{error:null}}
 },
 functions:{async invoke(name,{body}){
  if(name!=="pup-web-auth"||body?.action!=="status")return{data:null,error:new Error("PUP_ACCOUNT_SESSION_REQUIRED")};
  return signedOut?{data:null,error:new Error("PUP_ACCOUNT_SESSION_REQUIRED")}:{data:{verified:true,account:pup},error:null};
 }},
 from(table){
  if(table!=="puppy_web_saves")throw Error("Test-only table");
  return{select(){return this},eq(){return this},
   async maybeSingle(){return{data:record(),error:null}}};
 },
 async rpc(method,args){
  if(method!=="puppy_web_save_commit")throw Error("Unsupported test RPC");
  const previous=record(),expected=Number(previous?.revision||0);
  if(expected!==args.p_expected_revision)return{data:null,error:new Error("WEB_SAVE_CONFLICT")};
  const revision=expected+1;
  localStorage.setItem(key,JSON.stringify({revision,save_data:args.p_save_data}));
  return{data:revision,error:null};
 }
};
