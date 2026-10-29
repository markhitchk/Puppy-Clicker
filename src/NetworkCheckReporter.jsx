import {useEffect} from 'react';
import {client} from './supabase.js';
import {reportWebActivity} from './webActivity.js';

export default function NetworkCheckReporter(){
 useEffect(()=>{
  let active=true,token='',identity,networkIdentity;
  const send=async(event='heartbeat')=>{
   if(!active||document.visibilityState==='hidden')return;
   const session=await client?.auth.getSession().catch(()=>null);
   if(!active)return;
   token=session?.data?.session?.access_token||'';
   const nextIdentity=session?.data?.session?.user?.id||'visitor';
   const changed=nextIdentity!==identity;
   identity=nextIdentity;
   void reportWebActivity(changed?'page_view':event,{token});
   // Presence does not depend on the optional network-risk lookup.
   if(import.meta.env.VITE_NETWORK_CHECK_ENABLED!=='true'||networkIdentity===nextIdentity)return;
   networkIdentity=nextIdentity;
   try{await fetch('/api/network-check',{method:'POST',credentials:'same-origin',cache:'no-store',
    headers:token?{Authorization:'Bearer '+token}:{},signal:AbortSignal.timeout(5000)});}catch{}
  };
  const listener=client?.auth.onAuthStateChange((event)=>{
   if(event==='SIGNED_OUT'&&token)void reportWebActivity('logout',{token});
   if(event==='TOKEN_REFRESHED')return;
   setTimeout(()=>{if(active)void send();},0);
  });
  const visible=()=>document.visibilityState==='hidden'
   ?void reportWebActivity('session_end',{token}):void send('page_view');
  const end=()=>void reportWebActivity('session_end',{token});
  const page=()=>void send('page_view');
  const error=()=>void reportWebActivity('client_error',{token,errorCode:'BROWSER_RUNTIME_ERROR'});
  const rejected=()=>void reportWebActivity('client_error',{token,errorCode:'BROWSER_UNHANDLED_ERROR'});
  void send('page_view');
  const timer=setInterval(()=>void send(),30000);
  document.addEventListener('visibilitychange',visible);
  window.addEventListener('pagehide',end);window.addEventListener('popstate',page);
  window.addEventListener('error',error);window.addEventListener('unhandledrejection',rejected);
  return ()=>{
   active=false;clearInterval(timer);listener?.data?.subscription?.unsubscribe();
   document.removeEventListener('visibilitychange',visible);window.removeEventListener('pagehide',end);
   window.removeEventListener('popstate',page);window.removeEventListener('error',error);
   window.removeEventListener('unhandledrejection',rejected);
  };
 },[]);
 return null;
}
