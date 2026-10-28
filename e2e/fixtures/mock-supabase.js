// Test-only client, isolated from the real Puppy Clicker database.
const user={id:"e2e-puppy-clicker-user",email:"tester@example.invalid",
 user_metadata:{full_name:"Test Player"}};
const key="puppy_test_web_save_v1";
let signedOut=new URLSearchParams(window.location.search).has("signedout");
const record=()=>{try{return JSON.parse(localStorage.getItem(key)||"null")}catch{return null}};
export const client={
 auth:{
  onAuthStateChange(){return{data:{subscription:{unsubscribe(){}}}}},
  async getSession(){return{data:{session:signedOut?null:{user}},error:null}},
  async getUser(){return{data:{user:signedOut?null:user},error:null}},
  async signInWithOAuth(){return{data:null,error:null}},
  async signInWithPassword(){signedOut=false;return{data:{user},error:null}},
  async updateUser(){return{data:{user},error:null}},
  async signOut(){signedOut=true;return{error:null}}
 },
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
