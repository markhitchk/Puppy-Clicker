// Durable per-account gameplay intent queue. IndexedDB writes complete before
// an intent can be sent to Supabase; a browser crash or reload keeps pending work.
// Only server-authorized intent is stored, never balances, secrets or rewards.
const DATABASE='puppy-clicker-gameplay-outbox';
const STORE='operations';
let opening=null;
function open(){
 if(opening)return opening;
 opening=new Promise((resolve,reject)=>{
  if(typeof indexedDB==='undefined'){reject(new Error('PUP_LOCAL_CACHE_UNAVAILABLE'));return;}
  const request=indexedDB.open(DATABASE,1);
  request.onupgradeneeded=()=>{
   const db=request.result;
   if(!db.objectStoreNames.contains(STORE)){
    const store=db.createObjectStore(STORE,{keyPath:'key'});
    store.createIndex('account','accountId',{unique:false});
   }
  };
  request.onsuccess=()=>{request.result.onversionchange=()=>request.result.close();resolve(request.result);};
  request.onerror=()=>reject(request.error||new Error('PUP_LOCAL_CACHE_UNAVAILABLE'));
  request.onblocked=()=>reject(new Error('PUP_LOCAL_CACHE_BLOCKED'));
 }).catch(error=>{opening=null;throw error;});
 return opening;
}
function transact(mode,operation){
 return open().then(db=>new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,mode);
  let answer;
  try{answer=operation(tx.objectStore(STORE));}
  catch(error){try{tx.abort();}catch{}reject(error);return;}
  tx.oncomplete=()=>resolve(answer?.result);
  tx.onerror=()=>reject(tx.error||new Error('PUP_LOCAL_CACHE_UNAVAILABLE'));
  tx.onabort=()=>reject(tx.error||new Error('PUP_LOCAL_CACHE_UNAVAILABLE'));
 }));
}
function validAccount(accountId){
 if(typeof accountId!=='string'||!/^[0-9a-f-]{36}$/i.test(accountId))
  throw new Error('PUP_ACCOUNT_ID_INVALID');
}
export async function queueGameplayIntent(accountId,intent){
 validAccount(accountId);
 if(typeof crypto?.randomUUID!=='function')throw new Error('PUP_OPERATION_ID_UNAVAILABLE');
 const id=crypto.randomUUID();
 const entry={key:accountId+':'+id,accountId,id,intent,createdAt:Date.now()};
 await transact('readwrite',store=>store.add(entry));
 return entry;
}
export async function pendingGameplayIntents(accountId){
 validAccount(accountId);
 const entries=await transact('readonly',store=>store.index('account').getAll(accountId));
 return (entries||[]).sort((a,b)=>a.createdAt-b.createdAt||a.id.localeCompare(b.id));
}
export async function acknowledgeGameplayIntent(accountId,operationId){
 validAccount(accountId);
 return transact('readwrite',store=>store.delete(accountId+':'+operationId));
}
