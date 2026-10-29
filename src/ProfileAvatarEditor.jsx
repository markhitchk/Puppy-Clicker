import React,{useEffect,useState} from "react";
import {pupWebApi} from "./pupWebApi.js";
import {PUP_ACCOUNT_CHANGED,ProfileAvatar} from "./SiteAccountMenu.jsx";
import "./pup-customization.css";

export default function ProfileAvatarEditor({account,onChanged}){
 const [url,setUrl]=useState(account.avatarUrl||"");
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 useEffect(()=>setUrl(account.avatarUrl||""),[account.avatarUrl]);
 const save=async event=>{
  event.preventDefault();
  const value=url.trim();
  try{
   const parsed=new URL(value);
   if(parsed.protocol!=="https:"||parsed.username||parsed.password)throw Error("URL");
  }catch{setMessage("Use a valid public HTTPS image URL.");return;}
  setBusy(true);setMessage("");
  try{
   const response=await pupWebApi({action:"update",avatarUrl:value});
   onChanged(response.avatarUrl||null);
   window.dispatchEvent(new Event(PUP_ACCOUNT_CHANGED));
   setMessage("Profile picture link saved.");
  }catch{setMessage("Unable to save the URL. Check that it points to a public HTTPS image.");}
  finally{setBusy(false);}
 };
 const remove=async()=>{
  setBusy(true);setMessage("");
  try{
   await pupWebApi({action:"update",avatarUrl:null});
   onChanged(null);setUrl("");
   window.dispatchEvent(new Event(PUP_ACCOUNT_CHANGED));
   setMessage("Custom avatar removed. Your Discord avatar or initial will be shown.");
  }catch{setMessage("Unable to remove the custom avatar.");}
  finally{setBusy(false);}
 };
 return <section className="pup-avatar-editor" aria-label="Profile picture settings">
  <div className="pup-avatar-editor-preview"><ProfileAvatar account={account} className="profile-avatar-large"/>
   <div><strong>Profile picture</strong><small>Paste an image URL for your Pup Account and website menu.</small></div></div>
  <form className="pup-avatar-url-form" onSubmit={save}>
   <label htmlFor="pup-avatar-url">Image URL (HTTPS)</label>
   <input id="pup-avatar-url" type="url" autoComplete="off"
    placeholder="https://images.example.com/avatar.png" value={url}
    disabled={busy} onChange={e=>setUrl(e.target.value)} required/>
   <div className="pup-avatar-editor-actions">
    <button className="cta cta-primary" type="submit" disabled={busy}>{busy?"Saving…":"Save image URL"}</button>
    {account.avatarUrl?<button className="cta cta-secondary" type="button"
      disabled={busy} onClick={remove}>Remove picture</button>:null}
   </div>
  </form>
  <small>Use a public direct image link. The image host may see visitors' IP addresses when avatars load.</small>
  {message?<p role="status" className="portal-message">{message}</p>:null}
 </section>;
}
