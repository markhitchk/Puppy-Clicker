import React,{useEffect,useState} from "react";
import {pupWebApi} from "./pupWebApi.js";
import {normalizeAvatarUrl} from "./avatarUrl.js";
import {PUP_ACCOUNT_CHANGED,ProfileAvatar} from "./SiteAccountMenu.jsx";
import "./pup-customization.css";

export default function ProfileAvatarEditor({account,onChanged}){
 const existing=account?.avatarUrl||"";
 const [url,setUrl]=useState(existing);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const normalized=normalizeAvatarUrl(url);
 useEffect(()=>setUrl(account?.avatarUrl||""),[account?.avatarUrl]);

 const save=async event=>{
  event.preventDefault();
  if(busy)return;
  if(!normalized){setMessage("Enter a valid public HTTPS image URL.");return;}
  setBusy(true);setMessage("");
  try{
   const updated=await pupWebApi({action:"update",avatarUrl:normalized});
   const saved=updated.avatarUrl||normalized;
   setUrl(saved);
   onChanged(saved);
   window.dispatchEvent(new Event(PUP_ACCOUNT_CHANGED));
   setMessage("Your profile picture URL has been saved.");
  }catch{setMessage("Unable to save the avatar URL. Please try again.");}
  finally{setBusy(false);}
 };
 const remove=async()=>{
  if(busy)return;
  setBusy(true);setMessage("");
  try{
   await pupWebApi({action:"update",avatarUrl:null});
   setUrl("");
   onChanged(null);
   window.dispatchEvent(new Event(PUP_ACCOUNT_CHANGED));
   setMessage("Custom avatar removed. Your Discord avatar or initial will be shown.");
  }catch{setMessage("Unable to remove the custom avatar.");}
  finally{setBusy(false);}
 };
 const previewAccount={...account,avatarUrl:url.trim()===""?null:(normalized||existing)};
 return <section className="pup-avatar-editor" aria-label="Profile picture settings">
  <div className="pup-avatar-editor-preview"><ProfileAvatar account={previewAccount} className="profile-avatar-large"/>
   <div><strong>Profile picture</strong><small>Shown in your Pup Account and website menu.</small></div></div>
  <form className="pup-avatar-url-form" onSubmit={save}>
   <label htmlFor="pup-avatar-url">Image URL</label>
   <input id="pup-avatar-url" type="url" inputMode="url" autoComplete="url"
    placeholder="https://example.com/my-avatar.png" maxLength={2048}
    value={url} onChange={event=>{setUrl(event.target.value);setMessage("");}}
    aria-invalid={Boolean(url.trim()&&!normalized)} disabled={busy}/>
   {url.trim()&&!normalized?<small role="alert" className="pup-avatar-url-error">Enter a public HTTPS image URL (not a private address).</small>:null}
   <div className="pup-avatar-editor-actions">
    <button className="cta cta-primary" type="submit" disabled={busy||!normalized||normalized===existing}>
     {busy?"Saving…":"🔗 Save avatar URL"}
    </button>
    {existing?<button className="cta cta-secondary" type="button"
     disabled={busy} onClick={remove}>Remove picture</button>:null}
   </div>
  </form>
  <small>Paste a direct link to a publicly accessible image (PNG, JPG, WebP or another browser-supported format). The preview updates as you type. Your avatar is publicly visible; the image host may see visitors' IP addresses.</small>
  {message?<p role="status" className="portal-message">{message}</p>:null}
 </section>;
}
