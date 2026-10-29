import React,{useEffect,useId,useRef,useState} from "react";
import {client} from "./supabase.js";
import {verifyPuppySession} from "./native/web/puppyOAuth.js";
import "./site-account-menu.css";

export const PUP_ACCOUNT_CHANGED="puppy-clicker:pup-account-changed";

const displayName=account=>account?.displayName?.trim()||account?.username||"Pup Member";
const roleLabel=role=>({DEVELOPER:"Developer",ADMIN:"Administrator",PUP_MEMBER:"Pup Member",GUEST:"Guest"})[role]||"Player";

function discordAvatar(account){
 const url=account?.discordProfile?.avatarUrl;
 if(!url||typeof url!=="string")return null;
 try{
  const parsed=new URL(url);
  return parsed.protocol==="https:"&&
   ["cdn.discordapp.com","media.discordapp.net","cdn.discordapp.net"].includes(parsed.hostname)
   ?parsed.href:null;
 }catch{return null;}
}

/** Only a verified Pup Account can be represented by the account button. */
export function ProfileAvatar({account,className=""}){
 const [failed,setFailed]=useState(false);
 const src=discordAvatar(account);
 useEffect(()=>setFailed(false),[src]);
 const initial=Array.from(displayName(account))[0]?.toLocaleUpperCase()||"🐾";
 return <span className={"pup-avatar "+className} role="img"
   aria-label={"Profile avatar for "+displayName(account)}>
  {src&&!failed?<img src={src} alt="" loading="lazy" referrerPolicy="no-referrer"
    onError={()=>setFailed(true)}/>:<span className="pup-avatar-initial" aria-hidden="true">{initial}</span>}
 </span>;
}

export default function SiteAccountMenu({active=false,placement="down",compact=false}){
 const dropdownId=useId();
 const [account,setAccount]=useState(null);
 const [open,setOpen]=useState(false);
 const [signingOut,setSigningOut]=useState(false);
 const [signOutError,setSignOutError]=useState("");
 const mounted=useRef(true);
 const container=useRef(null);
 const trigger=useRef(null);
 useEffect(()=>{
  mounted.current=true;
  if(!client)return;
  let request=0;
  const refresh=async()=>{
   const version=++request;
   try{
    const {data,error}=await client.auth.getUser();
    if(error||!data?.user){
     if(mounted.current&&request===version){setAccount(null);setOpen(false);}
     return;
    }
    // Supabase is shared with other apps. Never show an unverified identity.
    const verified=await verifyPuppySession(client);
    if(mounted.current&&request===version)setAccount(verified);
   }catch{
    if(mounted.current&&request===version){setAccount(null);setOpen(false);}
   }
  };
  // Re-read the authoritative account after any same-tab profile change.
  const onUpdated=()=>{void refresh();};
  const {data}=client.auth.onAuthStateChange((event)=>{
   if(event==="SIGNED_OUT"){++request;setAccount(null);setOpen(false);return;}
   // The Supabase auth lock must be released before verifying with Edge Functions.
   setTimeout(()=>{if(mounted.current)void refresh();},0);
  });
  window.addEventListener(PUP_ACCOUNT_CHANGED,onUpdated);
  void refresh();
  return ()=>{
   mounted.current=false;++request;
   data?.subscription?.unsubscribe();
   window.removeEventListener(PUP_ACCOUNT_CHANGED,onUpdated);
  };
 },[]);

 useEffect(()=>{
  if(!open)return;
  const onPointerDown=event=>{
   if(!container.current?.contains(event.target))setOpen(false);
  };
  const onKeyDown=event=>{
   if(event.key==="Escape"){
    setOpen(false);
    trigger.current?.focus();
   }
  };
  document.addEventListener("pointerdown",onPointerDown);
  document.addEventListener("keydown",onKeyDown);
  return ()=>{
   document.removeEventListener("pointerdown",onPointerDown);
   document.removeEventListener("keydown",onKeyDown);
  };
 },[open]);

 const signOut=async()=>{
  if(!client||signingOut)return;
  setSigningOut(true);setSignOutError("");
  try{
   const {error}=await client.auth.signOut();
   if(error)throw error;
   window.location.assign("/");
  }catch{
   setSignOutError("Couldn't sign out. Please retry.");
   setSigningOut(false);
  }
 };
 if(!account)return <a href="/account" className="site-account-signed-out"
   aria-current={active?"page":undefined}>Account</a>;
 const name=displayName(account);
 const username=account.username?"@"+account.username:"Pup Member";
 const staff=["ADMIN","DEVELOPER"].includes(account.guildRole);
 return <div ref={container} className={"site-account "+(compact?"site-account-compact ":"")+(placement==="up"?"site-account-up":"site-account-down")}
   data-testid="site-account">
  <button ref={trigger} type="button" className="site-account-trigger"
   aria-label={"Account menu for "+name}
   aria-haspopup="true" aria-expanded={open} aria-controls={dropdownId}
   onClick={()=>{setSignOutError("");setOpen(value=>!value);}}>
   <ProfileAvatar account={account} className="site-account-trigger-avatar"/>
   <span className="site-account-trigger-identity"><strong>{name}</strong><small>{username}</small></span>
   <span className="site-account-chevron" aria-hidden="true">{open?"⌃":"⌄"}</span>
  </button>
  {open?<div className="site-account-dropdown" id={dropdownId} data-testid="site-account-dropdown">
   <div className="site-account-preview">
    <ProfileAvatar account={account} className="site-account-preview-avatar"/>
    <div className="site-account-preview-info">
     <strong>{name}</strong><span>{username}</span>
     <small>✓ {account.status==="VERIFIED"||!account.status?"Verified Pup Account":account.status} · {roleLabel(account.guildRole)}</small>
    </div>
   </div>
   {account.friendCode?<div className="site-account-friend-code"><span>Friend Code</span><strong>{account.friendCode}</strong></div>:null}
   <nav className="site-account-dropdown-links" aria-label="Account actions">
    <a href="/account" aria-current={active?"page":undefined}><span aria-hidden="true">👤</span>View full profile</a>
    <a href="/account#profile-settings"><span aria-hidden="true">✏️</span>Edit display name</a>
    <a href="/account#account-security"><span aria-hidden="true">🔒</span>Login &amp; security</a>
    <a href="/account#account-management"><span aria-hidden="true">⚙️</span>Account settings</a>
    {staff?<a href="/account/admin"><span aria-hidden="true">🛡️</span>Administration</a>:null}
   </nav>
   <div className="site-account-dropdown-footer">
    <button type="button" onClick={()=>void signOut()} disabled={signingOut}>
     <span aria-hidden="true">↪</span>{signingOut?"Signing out…":"Sign out"}
    </button>
    {signOutError?<p role="alert">{signOutError}</p>:null}
   </div>
  </div>:null}
 </div>;
}
