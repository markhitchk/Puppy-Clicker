const SESSION_KEY='puppy-web-activity-session-v1';
let sessionId;
export function getActivitySessionId(){
 if(sessionId)return sessionId;
 try{sessionId=globalThis.sessionStorage?.getItem(SESSION_KEY);}catch{}
 if(!/^[0-9a-f-]{36}$/i.test(sessionId||'')){
  sessionId=globalThis.crypto?.randomUUID?.();
  if(sessionId)try{globalThis.sessionStorage?.setItem(SESSION_KEY,sessionId);}catch{}
 }
 return sessionId||null;
}
export async function reportWebActivity(event,{token='',errorCode=null,provider=null}={}){
 const id=getActivitySessionId();
 if(!id)return;
 try{
  await fetch('/api/activity',{method:'POST',credentials:'same-origin',cache:'no-store',keepalive:true,
   headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},
   body:JSON.stringify({sessionId:id,event,path:globalThis.location?.pathname||'/',errorCode,provider}),
   signal:AbortSignal.timeout(5000)});
 }catch{/* Optional reporting never interrupts account access or gameplay. */}
}
