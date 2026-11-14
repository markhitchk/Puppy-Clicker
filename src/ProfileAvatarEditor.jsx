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
 const hostPageLink=/^https:\/\/(?:www\.|m\.)?(?:imgur\.com|imgbb\.com|ibb\.co|postimg\.cc)\//i.test(url.trim());
 const invalidHint=hostPageLink
  ? "That's a hosting page link. Copy the direct image address instead (for Imgur, https://i.imgur.com/IMAGE.jpg)."
  : "Enter a public HTTPS image URL (not a private address).";
 return <section className="pup-avatar-editor" aria-label="Profile picture settings">
  <div className="pup-avatar-editor-preview"><ProfileAvatar account={previewAccount} className="profile-avatar-large"/>
   <div><strong>Profile picture</strong><small>Shown on the website and Android app with your Pup Account.</small></div></div>
  <div className="pup-avatar-hosts" aria-label="External image hosting options">
   <strong>Need to upload a picture?</strong>
   <p>Upload your image to an external host, copy its <strong>direct image URL</strong>, then paste it below.</p>
   <div className="pup-avatar-host-links">
    <a href="https://imgur.com/" target="_blank" rel="noopener noreferrer">Upload on Imgur ↗</a>
    <a href="https://imgbb.com/" target="_blank" rel="noopener noreferrer">Upload on ImgBB ↗</a>
    <a href="https://postimages.org/" target="_blank" rel="noopener noreferrer">Upload on Postimages ↗</a>
   </div>
  </div>
  <form className="pup-avatar-url-form" onSubmit={save}>
   <label htmlFor="pup-avatar-url">Image URL</label>
   <input id="pup-avatar-url" type="url" inputMode="url" autoComplete="url"
    placeholder="https://example.com/my-avatar.png" maxLength={2048}
    value={url} onChange={event=>{setUrl(event.target.value);setMessage("");}}
    aria-invalid={Boolean(url.trim()&&!normalized)} disabled={busy}/>
   {url.trim()&&!normalized?<small role="alert" className="pup-avatar-url-error">{invalidHint}</small>:null}
   <div className="pup-avatar-editor-actions">
    <button className="cta cta-primary" type="submit" disabled={busy||!normalized||normalized===existing}>
     {busy?"Saving…":"🔗 Save avatar URL"}
    </button>
    {existing?<button className="cta cta-secondary" type="button"
     disabled={busy} onClick={remove}>Remove picture</button>:null}
   </div>
  </form>
  <small>For Imgur, use a link such as https://i.imgur.com/IMAGE.jpg, not an imgur.com post or gallery page. Use a publicly accessible image (PNG, JPG or WebP). The preview updates as you type. Your avatar is public; the image host may log viewers' IP addresses, and removing it here does not delete it from the image host.</small>
  {message?<p role="status" className="portal-message">{message}</p>:null}
 </section>;
}
