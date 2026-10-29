const attempts=new WeakMap();
export function completeRecoveryCallback(client){
 if(attempts.has(client))return attempts.get(client);
 const location=globalThis.location;
 if(location?.pathname!=='/recovery')return Promise.resolve({status:'none'});
 const params=new URLSearchParams(location.search);
 const fragment=new URLSearchParams((location.hash||'').replace(/^#/,''));
 const code=params.get('code');
 if(!code&&!params.has('error')&&!fragment.has('error'))return Promise.resolve({status:'none'});
 globalThis.history.replaceState(globalThis.history.state,'','/recovery');
 const attempt=(async()=>{
  if(params.has('error')||fragment.has('error')||!client||
     !/^[A-Za-z0-9._~-]{8,1024}$/.test(code||''))throw Error('EMAIL_LINK_INVALID');
  const {error}=await client.auth.exchangeCodeForSession(code);
  if(error)throw Error('EMAIL_LINK_INVALID');
  return {status:'complete'};
 })();
 attempts.set(client,attempt);
 return attempt;
}
