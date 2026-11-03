import React,{useEffect,useId,useRef} from "react";
import {createPortal} from "react-dom";
import "./ConfirmSignOut.css";

export default function ConfirmSignOut({open,busy=false,error="",onCancel,onConfirm}){
 const ref=useRef(null),cancelRef=useRef(null);
 const title=useId(),description=useId();
 useEffect(()=>{
  if(!open)return;
  const dialog=ref.current;
  if(!dialog)return;
  const previousFocus=document.activeElement,previousOverflow=document.body.style.overflow;
  document.body.style.overflow="hidden";
  if(!dialog.open)dialog.showModal();
  cancelRef.current?.focus();
  return()=>{
   if(dialog.open)dialog.close();
   document.body.style.overflow=previousOverflow;
   previousFocus?.focus?.();
  };
 },[open]);
 if(typeof document==="undefined")return null;
 return createPortal(<dialog ref={ref} className="pup-signout-dialog"
  aria-labelledby={title} aria-describedby={description}
  onCancel={event=>{event.preventDefault();if(!busy)onCancel();}}
  onClick={event=>{if(event.target===event.currentTarget&&!busy)onCancel();}}>
  <div className="pup-signout-icon" aria-hidden="true">🐾</div>
  <h2 id={title}>Sign out of Puppy Clicker?</h2>
  <p id={description}>You'll need to sign in again to access your Pup Account and saved puppy progress.</p>
  {error?<p className="pup-signout-error" role="alert">{error}</p>:null}
  <div className="pup-signout-actions">
   <button ref={cancelRef} className="pup-signout-cancel" type="button" disabled={busy} onClick={onCancel}>Stay signed in</button>
   <button className="pup-signout-confirm" type="button" disabled={busy} onClick={onConfirm}>{busy?"Signing out…":"Yes, sign out"}</button>
  </div>
 </dialog>,document.body);
}
