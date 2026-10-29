import React,{useState} from "react";
import {client} from "./supabase.js";
import {pupWebApi} from "./pupWebApi.js";
import {PUP_ACCOUNT_CHANGED,ProfileAvatar} from "./SiteAccountMenu.jsx";
import "./pup-customization.css";

export default function ProfileAvatarEditor({account,onChanged}){
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const upload=async event=>{
  const file=event.target.files?.[0];
  event.target.value="";
  if(!file)return;
  if(!["image/png","image/jpeg","image/webp"].includes(file.type)||file.size>2097152||file.size===0){
   setMessage("Choose a PNG, JPG or WebP image no larger than 2 MB.");return;
  }
  setBusy(true);setMessage("");
  try{
   const {data,error}=await client.auth.getUser();
   if(error||!data?.user)throw Error("SIGN_IN_REQUIRED");
   const extension={"image/png":"png","image/jpeg":"jpg","image/webp":"webp"}[file.type];
   const path=data.user.id+"/avatar."+extension;
   const result=await client.storage.from("pup-profile-avatars").upload(path,file,{
    cacheControl:"3600",contentType:file.type,upsert:true
   });
   if(result.error)throw result.error;
   const updated=await pupWebApi({action:"update",avatarPath:path});
   onChanged(updated.avatarUrl||null);
   window.dispatchEvent(new Event(PUP_ACCOUNT_CHANGED));
   setMessage("Your profile picture has been updated.");
  }catch{setMessage("Unable to upload the photo. Please try again.");}
  finally{setBusy(false);}
 };
 const remove=async()=>{
  setBusy(true);setMessage("");
  try{
   await pupWebApi({action:"update",avatarPath:null});
   onChanged(null);
   window.dispatchEvent(new Event(PUP_ACCOUNT_CHANGED));
   setMessage("Custom avatar removed. Discord avatar or your initial will be shown.");
  }catch{setMessage("Unable to remove the custom avatar.");}
  finally{setBusy(false);}
 };
 return <section className="pup-avatar-editor" aria-label="Profile picture settings">
  <div className="pup-avatar-editor-preview"><ProfileAvatar account={account} className="profile-avatar-large"/>
   <div><strong>Profile picture</strong><small>Shown in your Pup Account and website menu.</small></div></div>
  <div className="pup-avatar-editor-actions">
   <label className="cta cta-primary" htmlFor="pup-avatar-upload" aria-disabled={busy}>
    {busy?"Uploading…":"📷 Upload picture"}
   </label>
   <input id="pup-avatar-upload" type="file" accept="image/png,image/jpeg,image/webp"
    disabled={busy} onChange={upload}/>
   {account.avatarUrl?<button className="cta cta-secondary" type="button"
    disabled={busy} onClick={remove}>Remove picture</button>:null}
  </div>
  <small>PNG, JPG or WebP · max 2 MB. Your profile picture is publicly visible.</small>
  {message?<p role="status" className="portal-message">{message}</p>:null}
 </section>;
}
