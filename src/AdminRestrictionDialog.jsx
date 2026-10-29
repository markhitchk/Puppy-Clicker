import React,{useEffect,useRef,useState} from 'react';
import {formatTime} from './adminPresentation.js';

export default function AdminRestrictionDialog({user,type,busy,onClose,onSubmit}){
 const dialog=useRef(null);
 const [reason,setReason]=useState(''),[duration,setDuration]=useState('86400000');
 const [custom,setCustom]=useState(''),[error,setError]=useState('');
 const suspension=type==='suspension';
 useEffect(()=>{dialog.current?.showModal();},[]);
 const expiresAt=duration==='permanent'?null:duration==='custom'
  ?(custom&&Number.isFinite(Date.parse(custom))?new Date(custom).toISOString():null)
  :new Date(Date.now()+Number(duration)).toISOString();
 const submit=event=>{
  event.preventDefault();setError('');
  if(duration!=='permanent'&&(!expiresAt||Date.parse(expiresAt)<=Date.now())){
   setError('Choose an end time in the future.');return;
  }
  void onSubmit({action:suspension?'suspend-account':'ban-account',targetPlayerId:user.id,reason:reason.trim(),expiresAt});
 };
 return <dialog ref={dialog} className="pup-admin-modal" aria-labelledby="restriction-title"
  onCancel={event=>{event.preventDefault();if(!busy)onClose();}}>
  <h2 id="restriction-title">{suspension?'Suspend':'Ban'} @{user.username}</h2>
  <p>{suspension?'Pause account access until the selected end time.':'Block account access for a selected duration or permanently.'} This applies to the website and Android.</p>
  <form onSubmit={submit}>
   <label>Public reason<textarea autoFocus required minLength={3} maxLength={300} value={reason}
    disabled={busy} placeholder="Explain the restriction to the player…" onChange={e=>setReason(e.target.value)}/></label>
   <label>Duration<select value={duration} disabled={busy} onChange={e=>setDuration(e.target.value)}>
    <option value="3600000">1 hour</option><option value="21600000">6 hours</option>
    <option value="86400000">24 hours</option><option value="259200000">3 days</option>
    <option value="604800000">7 days</option><option value="2592000000">30 days</option>
    <option value="custom">Custom end time</option>{!suspension?<option value="permanent">Permanent</option>:null}
   </select></label>
   {duration==='custom'?<label>End date and time<input type="datetime-local" required value={custom}
    disabled={busy} onChange={e=>setCustom(e.target.value)}/></label>:null}
   <p className="pup-admin-note">{expiresAt?'Access resumes automatically after '+formatTime(expiresAt)+'.':
    duration==='permanent'?'This ban lasts until staff lift it.':'Choose when access should resume.'} Staff can lift this restriction early. Saved progress is preserved.</p>
   {error?<p role="alert" className="pup-admin-error">{error}</p>:null}
   <div className="pup-admin-modal-actions">
    <button type="button" onClick={onClose} disabled={busy}>Cancel</button>
    <button type="submit" className="pup-admin-danger-button" disabled={busy||reason.trim().length<3}>
     {busy?'Saving…':suspension?'Confirm suspension':'Confirm ban'}</button>
   </div>
  </form>
 </dialog>;
}
