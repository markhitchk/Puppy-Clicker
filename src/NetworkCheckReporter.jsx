import {useEffect} from "react";
import {client} from "./supabase.js";

// Account presence is not VPN detection: it records a verified web session and
// a recent heartbeat. Optional network-risk checks remain separately gated.
const sessionId=()=>{
  try{
    const key="puppy-web-tab-session-v1";
    const previous=window.sessionStorage.getItem(key);
    if(previous&&/^[0-9a-f-]{36}$/i.test(previous))return previous;
    const next=globalThis.crypto?.randomUUID?.();
    if(next)window.sessionStorage.setItem(key,next);
    return next||null;
  }catch{return globalThis.crypto?.randomUUID?.()||null;}
};

export default function NetworkCheckReporter(){
  useEffect(()=>{
    if(!client||window.location.pathname==="/auth/discord/callback")return;
    const browserSessionId=sessionId();
    if(!browserSessionId)return;
    let alive=true;
    let sending=false;
    let checkedToken="";
    const send=async()=>{
      if(!alive||sending||document.visibilityState==="hidden")return;
      sending=true;
      try{
        const session=await client.auth.getSession();
        if(!alive)return;
        const token=session.data?.session?.access_token;
        if(!token)return; // Anonymous browsers are not registered Pup Accounts.
        await fetch("/api/presence",{
          method:"POST",credentials:"same-origin",cache:"no-store",
          headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},
          body:JSON.stringify({browserSessionId,path:window.location.pathname})
        });
        // Legacy VPN/ProxyCheck lookup stays opt-in; it is not required
        // to show a user's latest verified website connection.
        if(import.meta.env.VITE_NETWORK_CHECK_ENABLED==="true"&&checkedToken!==token){
          checkedToken=token;
          await fetch("/api/network-check",{
            method:"POST",headers:{"Authorization":"Bearer "+token},
            credentials:"same-origin",cache:"no-store"
          });
        }
      }catch{/* Telemetry may never block account access or gameplay. */}
      finally{sending=false;}
    };
    void send();
    const tick=window.setInterval(()=>void send(),60_000);
    const onVisible=()=>{if(document.visibilityState==="visible")void send();};
    document.addEventListener("visibilitychange",onVisible);
    const subscription=client.auth.onAuthStateChange(()=>{
      window.setTimeout(()=>{if(alive)void send();},0);
    });
    return()=>{
      alive=false;window.clearInterval(tick);
      document.removeEventListener("visibilitychange",onVisible);
      subscription.data.subscription.unsubscribe();
    };
  },[]);
  return null;
}
