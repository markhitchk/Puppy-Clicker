// Browser-side storage encryption for Supabase Auth persistence.
// These are *not cookies*: browser JS must still read the session to call Supabase.
// The AES-GCM key lives as a non-extractable CryptoKey in origin-scoped IndexedDB.
// This reduces exposure from passive localStorage dumps, but NOT from XSS or a
// malicious same-origin script. Never claim the data is HttpOnly or XSS-proof.
const DB_NAME="puppy-clicker-auth-vault-v1";
const KEY_STORE="keys";
const KEY_ID="supabase-auth";
const PREFIX="puppy-auth-aesgcm-v1:";
const encoder=new TextEncoder();


function localStorageOrNull(){
 try{return globalThis.localStorage||null;}catch{return null;}
}
function toBase64(bytes){
 let binary="";
 for(let index=0;index<bytes.length;index+=8192){
  binary+=String.fromCharCode(...bytes.subarray(index,index+8192));
 }
 return btoa(binary);
}
function fromBase64(value){
 const binary=atob(value);
 const bytes=new Uint8Array(binary.length);
 for(let index=0;index<binary.length;index++)bytes[index]=binary.charCodeAt(index);
 return bytes;
}

// An IndexedDB readwrite transaction serializes initial key creation across
// concurrent tabs. Generate a candidate before starting the transaction: an
// async crypto operation *inside* an active transaction could close it early.
export async function getBrowserVaultKey(cryptoApi=globalThis.crypto,idb=globalThis.indexedDB){
 if(!cryptoApi?.subtle||!cryptoApi?.getRandomValues||!idb)throw Error("ENCRYPTED_STORAGE_UNAVAILABLE");
 const candidate=await cryptoApi.subtle.generateKey({name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
 const db=await new Promise((resolve,reject)=>{
  const request=idb.open(DB_NAME,1);
  request.onupgradeneeded=()=>{
   if(!request.result.objectStoreNames.contains(KEY_STORE))request.result.createObjectStore(KEY_STORE);
  };
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error||Error("ENCRYPTED_STORAGE_OPEN_FAILED"));
  request.onblocked=()=>reject(Error("ENCRYPTED_STORAGE_BLOCKED"));
 });
 try{
  return await new Promise((resolve,reject)=>{
   const transaction=db.transaction(KEY_STORE,"readwrite");
   const store=transaction.objectStore(KEY_STORE);
   let selected=null;
   const request=store.get(KEY_ID);
   request.onsuccess=()=>{
    selected=request.result||candidate;
    if(!request.result)store.put(candidate,KEY_ID);
   };
   transaction.oncomplete=()=>resolve(selected);
   transaction.onerror=()=>reject(transaction.error||Error("ENCRYPTED_STORAGE_WRITE_FAILED"));
   transaction.onabort=()=>reject(transaction.error||Error("ENCRYPTED_STORAGE_ABORTED"));
  });
 }finally{db.close();}
}

export function createEncryptedAuthStorage({
 storage=localStorageOrNull(),
 cryptoApi=globalThis.crypto,
 keyProvider=()=>getBrowserVaultKey(cryptoApi)
}={}){
 let cachedKey=null;
 const memoryOnly=new Map();
 const getKey=()=>{
  if(!cachedKey)cachedKey=Promise.resolve().then(keyProvider).catch(error=>{cachedKey=null;throw error;});
  return cachedKey;
 };
 async function encrypt(key,value){
  const iv=cryptoApi.getRandomValues(new Uint8Array(12));
  const encrypted=new Uint8Array(await cryptoApi.subtle.encrypt(
   {name:"AES-GCM",iv,additionalData:encoder.encode(key)},
   await getKey(),encoder.encode(String(value))
  ));
  const payload=new Uint8Array(iv.length+encrypted.length);
  payload.set(iv);payload.set(encrypted,iv.length);
  return PREFIX+toBase64(payload);
 }
 async function decrypt(key,value){
  const payload=fromBase64(value.slice(PREFIX.length));
  if(payload.length<29)throw Error("ENCRYPTED_STORAGE_INVALID");
  const plain=await cryptoApi.subtle.decrypt(
   {name:"AES-GCM",iv:payload.subarray(0,12),additionalData:encoder.encode(key)},
   await getKey(),payload.subarray(12)
  );
  return new TextDecoder().decode(plain);
 }
 return {
  async getItem(key){
   let stored=null;
   try{stored=storage?.getItem(key)??null;}catch{}
   if(stored===null)return memoryOnly.get(key)??null;
   if(stored.startsWith(PREFIX)){
    try{return await decrypt(key,stored);}catch{
     // Lost/corrupt vault keys must not expose encrypted data or cause crashes.
     try{storage?.removeItem(key);}catch{}
     return null;
    }
   }
   // One-time migration of existing plaintext Supabase sessions. Never discard
   // a working session until the ciphertext is written or saved in memory.
   await this.setItem(key,stored);
   return stored;
  },
  async setItem(key,value){
   const text=String(value);
   try{
    const ciphertext=await encrypt(key,text);
    if(!storage)throw Error("PERSISTENCE_UNAVAILABLE");
    storage.setItem(key,ciphertext);
    memoryOnly.delete(key);
   }catch{
    // Fail closed: in browsers with blocked crypto/IndexedDB/localStorage,
    // retain the session in memory only, NEVER persist raw access tokens.
    memoryOnly.set(key,text);
    try{storage?.removeItem(key);}catch{}
   }
  },
  async removeItem(key){
   memoryOnly.delete(key);
   try{storage?.removeItem(key);}catch{}
  }
 };
}

// The prefix is public; AES keys and plaintext tokens are never exported.
export const AUTH_STORAGE_PREFIX=PREFIX;
export const encryptedAuthStorage=createEncryptedAuthStorage();
