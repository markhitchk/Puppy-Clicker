import test from "node:test";
import assert from "node:assert/strict";
import {webcrypto} from "node:crypto";
import {readFileSync} from "node:fs";
import {createEncryptedAuthStorage,AUTH_STORAGE_PREFIX} from "../src/authStorage.js";

const key=()=>webcrypto.subtle.generateKey({name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
const storage=()=>{
 const map=new Map();
 return {map,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
};
const adapter=(box,getKey)=>createEncryptedAuthStorage({storage:box,cryptoApi:webcrypto,keyProvider:getKey});

test("Supabase session persistence is encrypted with AES-GCM, not plaintext",async()=>{
 const box=storage(),secretKey=await key(),vault=adapter(box,async()=>secretKey);
 const secret='{"access_token":"PRIVATE_ACCESS_TOKEN","refresh_token":"PRIVATE_REFRESH_TOKEN"}';
 await vault.setItem("sb-test-auth-token",secret);
 const written=box.getItem("sb-test-auth-token");
 assert.ok(written.startsWith(AUTH_STORAGE_PREFIX));
 assert.ok(!written.includes("PRIVATE_ACCESS_TOKEN"));
 assert.ok(!written.includes("PRIVATE_REFRESH_TOKEN"));
 assert.equal(await vault.getItem("sb-test-auth-token"),secret);
 // The same origin's nonextractable IndexedDB key allows reading after reload.
 const reopened=adapter(box,async()=>secretKey);
 assert.equal(await reopened.getItem("sb-test-auth-token"),secret);
 assert.equal(secretKey.extractable,false);
});

test("migrates an existing Supabase plaintext session without signing out",async()=>{
 const box=storage(),secretKey=await key();
 const legacy='{"access_token":"LEGACY_ACCESS_TOKEN","refresh_token":"LEGACY_REFRESH_TOKEN"}';
 box.setItem("sb-test-auth-token",legacy);
 const vault=adapter(box,async()=>secretKey);
 assert.equal(await vault.getItem("sb-test-auth-token"),legacy);
 assert.ok(box.getItem("sb-test-auth-token").startsWith(AUTH_STORAGE_PREFIX));
 assert.ok(!box.getItem("sb-test-auth-token").includes("LEGACY_"));
 assert.equal(await vault.getItem("sb-test-auth-token"),legacy);
});

test("randomized IVs and authenticated storage key prevent substitution",async()=>{
 const box=storage(),secretKey=await key(),vault=adapter(box,async()=>secretKey);
 await vault.setItem("sb-test-auth-token",'{"refresh_token":"SENSITIVE"}');
 const first=box.getItem("sb-test-auth-token");
 await vault.setItem("sb-test-auth-token",'{"refresh_token":"SENSITIVE"}');
 const second=box.getItem("sb-test-auth-token");
 assert.notEqual(first,second);
 box.setItem("sb-another-auth-token",first);
 assert.equal(await vault.getItem("sb-another-auth-token"),null);
 assert.equal(box.getItem("sb-another-auth-token"),null);
 assert.equal(await vault.getItem("sb-test-auth-token"),'{"refresh_token":"SENSITIVE"}');
});

test("encrypted ciphertext cannot be read with a different vault key",async()=>{
 const box=storage(),v1=adapter(box,async()=>await key());
 await v1.setItem("auth-token","KEEP_SECRET");
 const v2=adapter(box,async()=>await key());
 assert.equal(await v2.getItem("auth-token"),null);
 assert.equal(box.getItem("auth-token"),null);
});

test("blocked encryption never writes plaintext to persistent storage",async()=>{
 const box=storage();
 const vault=createEncryptedAuthStorage({
  storage:box,cryptoApi:{},keyProvider:async()=>{throw Error("no key");}
 });
 await vault.setItem("auth-token","SECRET_VOLATILE_SESSION");
 assert.equal(box.getItem("auth-token"),null);
 assert.equal(await vault.getItem("auth-token"),"SECRET_VOLATILE_SESSION");
 await vault.removeItem("auth-token");
 assert.equal(await vault.getItem("auth-token"),null);
});

test("legacy plaintext is removed from disk when encryption is blocked",async()=>{
 const box=storage();box.setItem("auth-token","OLD_PLAINTEXT");
 const vault=createEncryptedAuthStorage({storage:box,cryptoApi:{},keyProvider:async()=>{throw Error("blocked");}});
 assert.equal(await vault.getItem("auth-token"),"OLD_PLAINTEXT");
 assert.equal(box.getItem("auth-token"),null);
 assert.equal(await vault.getItem("auth-token"),"OLD_PLAINTEXT");
});

test("the Supabase client uses encrypted storage without changing PKCE and refresh",()=>{
 const source=readFileSync(new URL("../src/supabase.js",import.meta.url),"utf8");
 assert.match(source,/storage:\s*encryptedAuthStorage/);
 assert.match(source,/persistSession:\s*true/);
 assert.match(source,/autoRefreshToken:\s*true/);
 assert.match(source,/flowType:\s*"pkce"/);
});
