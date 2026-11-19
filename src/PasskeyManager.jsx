import React,{useEffect,useState} from "react";
import {passkeyAvailability,passkeyErrorMessage} from "./passkeys.js";

export default function PasskeyManager({client}){
 const availability=passkeyAvailability({client});
 const [items,setItems]=useState([]);
 const [loading,setLoading]=useState(false);
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState("");
 const [renameId,setRenameId]=useState(null);
 const [renameValue,setRenameValue]=useState("");
 const [removeId,setRemoveId]=useState(null);
 const load=async()=>{
  if(!client?.auth?.passkey?.list)return;
  const {data,error}=await client.auth.passkey.list();
  if(error)throw error;
  setItems(Array.isArray(data)?data:[]);
 };
 useEffect(()=>{
  if(!availability.available)return;
  let active=true;
  setLoading(true);
  client.auth.passkey.list().then(({data,error})=>{
   if(!active)return;
   if(error){setNotice(passkeyErrorMessage(error));return;}
   setItems(Array.isArray(data)?data:[]);
  }).catch(error=>{if(active)setNotice(passkeyErrorMessage(error));})
    .finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[client,availability.available]);

 const add=async()=>{
  if(busy||!availability.available)return;
  setBusy(true);setNotice("");
  try{
   const {error}=await client.auth.registerPasskey();
   if(error)throw error;
   await load();
   setNotice("Passkey added to your Pup Account. You can now sign in without typing your password.");
  }catch(error){setNotice(passkeyErrorMessage(error));}
  finally{setBusy(false);}
 };
 const rename=async id=>{
  const friendlyName=renameValue.trim();
  if(!friendlyName||friendlyName.length>120){setNotice("Use a name between 1 and 120 characters.");return;}
  setBusy(true);setNotice("");
  try{
   const {error}=await client.auth.passkey.update({passkeyId:id,friendlyName});
   if(error)throw error;
   await load();setRenameId(null);setRenameValue("");
   setNotice("Passkey renamed.");
  }catch(error){setNotice(passkeyErrorMessage(error));}
  finally{setBusy(false);}
 };
 const remove=async id=>{
  setBusy(true);setNotice("");
  try{
   const {error}=await client.auth.passkey.delete({passkeyId:id});
   if(error)throw error;
   await load();setRemoveId(null);setNotice("Passkey removed from this Pup Account.");
  }catch(error){setNotice(passkeyErrorMessage(error));}
  finally{setBusy(false);}
 };
 return <section className="portal-card pup-passkey-panel" id="account-passkeys" aria-labelledby="pup-passkey-heading">
  <h3 id="pup-passkey-heading">🔑 Passkeys</h3>
  <p>Sign in with your device screen lock, fingerprint, face unlock or a compatible security key. Your passkey's private key stays with your device or password manager.</p>
  {!availability.available?<p className="pup-passkey-info" role="status">{availability.reason}</p>:<>
   <div className="pup-passkey-top">
    <button type="button" className="cta cta-primary" disabled={busy||loading} onClick={()=>void add()}>
     {busy?"Updating passkeys…":"+ Add passkey"}
    </button>
    <span className="pup-passkey-summary">{loading?"Loading passkeys…":items.length+" registered"}</span>
   </div>
   {items.length===0&&!loading?<p className="pup-passkey-info">No passkeys registered yet. Password and linked Discord sign-in remain available.</p>:null}
   <div className="pup-passkey-list">
    {items.map(item=><div className="pup-passkey-row" key={item.id}>
     <div className="pup-passkey-identity">
      <strong>{item.friendly_name||"Passkey"}</strong>
      <small>Added {item.created_at?new Date(item.created_at).toLocaleDateString():"date unavailable"}{item.last_used_at?" · Last used "+new Date(item.last_used_at).toLocaleDateString():""}</small>
     </div>
     {renameId===item.id?<form className="pup-passkey-inline" onSubmit={e=>{e.preventDefault();void rename(item.id);}}>
      <label htmlFor={"passkey-name-"+item.id}>Passkey name</label>
      <input id={"passkey-name-"+item.id} required maxLength={120} value={renameValue} onChange={e=>setRenameValue(e.target.value)} disabled={busy}/>
      <button type="submit" disabled={busy}>Save</button>
      <button type="button" disabled={busy} onClick={()=>setRenameId(null)}>Cancel</button>
     </form>:removeId===item.id?<div className="pup-passkey-inline" role="group" aria-label="Confirm passkey removal">
      <span>Remove this passkey? Make sure another sign-in method works.</span>
      <button type="button" className="pup-passkey-danger" disabled={busy} onClick={()=>void remove(item.id)}>Confirm removal</button>
      <button type="button" disabled={busy} onClick={()=>setRemoveId(null)}>Cancel</button>
     </div>:<div className="pup-passkey-row-actions">
      <button type="button" disabled={busy} onClick={()=>{setRenameId(item.id);setRenameValue(item.friendly_name||"My passkey");setRemoveId(null);}}>Rename</button>
      <button type="button" disabled={busy} onClick={()=>{setRemoveId(item.id);setRenameId(null);}}>Remove</button>
     </div>}
    </div>)}
   </div>
   <p className="pup-passkey-info">Passkeys are optional. Keep a recovery method. Adding or removing a passkey does not affect puppy inventory, rewards or cloud saves.</p>
  </>}
  {notice?<p className="portal-message" role="status">{notice}</p>:null}
 </section>;
}
