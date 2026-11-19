import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {passkeyAvailability,passkeyErrorMessage,signInWithPupPasskey,PASSKEY_ORIGIN} from "../src/passkeys.js";

const mockAuth=()=>({
 signInWithPasskey:async()=>({data:{user:{id:"auth-user"},session:{access_token:"test-only"}}}),
 registerPasskey:async()=>({data:{id:"test-only"}}),
 passkey:{list:async()=>({data:[]})},
 signOut:async()=>({error:null})
});
test("only the canonical production domain can enroll passkeys",()=>{
 const client={auth:mockAuth()},credential=function PublicKeyCredential(){};
 assert.equal(passkeyAvailability({client,origin:PASSKEY_ORIGIN,secure:true,publicKeyCredential:credential}).available,true);
 assert.equal(passkeyAvailability({client,origin:"https://puppy-clicker-preview.vercel.app",secure:true,publicKeyCredential:credential}).available,false);
 assert.equal(passkeyAvailability({client,origin:PASSKEY_ORIGIN,secure:false,publicKeyCredential:credential}).available,false);
 assert.equal(passkeyAvailability({client,origin:PASSKEY_ORIGIN,secure:true,publicKeyCredential:null}).available,false);
 assert.equal(passkeyAvailability({client:{auth:{}},origin:PASSKEY_ORIGIN,secure:true,publicKeyCredential:credential}).available,false);
});
test("passkey sign-in accepts only server-linked Pup Accounts",async()=>{
 const auth=mockAuth(),client={auth};
 const verified=await signInWithPupPasskey(client,async()=>({id:"linked-pup-account"}));
 assert.equal(verified.user.id,"auth-user");
 assert.equal(verified.account.id,"linked-pup-account");
});
test("passkey sign-in rejects unlinked accounts and signs out temporary session",async()=>{
 let signOutCount=0;
 const auth=mockAuth();
 auth.signOut=async()=>{signOutCount+=1;return {error:null};};
 await assert.rejects(
  ()=>signInWithPupPasskey({auth},async()=>{throw Error("PUP_ACCOUNT_NOT_LINKED");}),
  {message:"PUP_PASSKEY_ACCOUNT_VERIFICATION_FAILED"}
 );
 assert.equal(signOutCount,1);
});
test("an unsuccessful passkey ceremony never attempts Pup Account verification",async()=>{
 let called=false;
 const auth=mockAuth();
 auth.signInWithPasskey=async()=>({data:null,error:{code:"webauthn_credential_not_found"}});
 await assert.rejects(()=>signInWithPupPasskey({auth},async()=>{called=true;}));
 assert.equal(called,false);
});
test("passkey errors do not echo provider messages or token content",()=>{
 const message=passkeyErrorMessage({code:"unknown",message:"token:secret"});
 assert.ok(!message.includes("token:secret"));
 assert.match(passkeyErrorMessage({code:"passkey_disabled"}),/not enabled/);
});
test("Puppy Clicker keeps encrypted Supabase persistence and server side passkey verification",()=>{
 const source=readFileSync(new URL("../src/supabase.js",import.meta.url),"utf8");
 const gate=readFileSync(new URL("../src/native/web/AccountGate.jsx",import.meta.url),"utf8");
 const account=readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8");
 assert.match(source,/experimental:\s*\{passkey:\s*true\}/);
 assert.match(source,/storage:\s*encryptedAuthStorage/);
 assert.match(gate,/signInWithPupPasskey\(client,verifyPuppySession\)/);
 assert.match(account,/<PasskeyManager client=\{client\}\/>/);
});
