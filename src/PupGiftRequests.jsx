import React,{useEffect,useState} from "react";
import {pupWebApi} from "./pupWebApi.js";
import "./pup-gift-requests.css";
const human=id=>id?.replace(/^v[0-9]_/, "").replaceAll("_"," ")||"Puppy";
const time=t=>t?new Date(t).toLocaleString():"—";

export default function PupGiftRequests(){
 const [puppies,setPuppies]=useState([]);
 const [requests,setRequests]=useState([]);
 const [puppyId,setPuppyId]=useState("");
 const [note,setNote]=useState("");
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const [error,setError]=useState("");
 const refresh=async()=>{
  try{
   const [catalog,history]=await Promise.all([
    pupWebApi({action:"catalog"}),pupWebApi({action:"my-requests"})
   ]);
   const allowed=(catalog.puppies||[]).filter(p=>p.giftable&&!p.bound);
   setPuppies(allowed);setRequests(history.requests||[]);
   setPuppyId(old=>allowed.some(p=>p.puppy_id===old)?old:allowed[0]?.puppy_id||"");
  }catch{setError("Gift requests are unavailable right now.");}
 };
 useEffect(()=>{void refresh();},[]);
 const submit=async(event)=>{
  event.preventDefault();if(!puppyId||busy)return;
  setBusy(true);setMessage("");setError("");
  try{
   await pupWebApi({action:"request",puppyId,note:note.trim()});
   setNote("");setMessage("Request submitted for staff review. Approval is not guaranteed.");
   await refresh();
  }catch(e){
   setError(({REQUEST_ALREADY_PENDING:"You already have a pending request.",
    REQUEST_COOLDOWN:"You can submit one request every 24 hours.",
    PUPPY_NOT_REQUESTABLE:"This puppy is not available for requests."})[e.message]||"Unable to submit the request.");
  }finally{setBusy(false);}
 };
 return <section className="portal-card pup-request-card" id="puppy-requests">
  <h3>🎁 Request a puppy</h3>
  <p>Request a system puppy for staff review. Requests do not automatically unlock puppies. Developer-only and account-bound puppies cannot be requested.</p>
  <form onSubmit={submit} className="pup-request-form">
   <label htmlFor="pup-request-puppy">Puppy</label>
   <select id="pup-request-puppy" required value={puppyId} onChange={e=>setPuppyId(e.target.value)}>
    {puppies.map(p=><option key={p.puppy_id} value={p.puppy_id}>{human(p.puppy_id)} ({p.puppy_id})</option>)}
   </select>
   <label htmlFor="pup-request-note">Reason (optional)</label>
   <textarea id="pup-request-note" maxLength={400} rows={3}
    placeholder="Why would you like this puppy?" value={note} onChange={e=>setNote(e.target.value)}/>
   <button type="submit" className="cta cta-primary" disabled={busy||!puppyId}>{busy?"Submitting…":"Send puppy request"}</button>
  </form>
  {message?<p role="status" className="portal-message">{message}</p>:null}
  {error?<p role="alert" className="pup-request-error">{error}</p>:null}
  <h4>Your requests</h4>
  {!requests.length?<p className="pup-request-muted">No requests yet.</p>:<div className="pup-request-history">
   {requests.map(r=><div key={r.id} className="pup-request-row">
    <strong>{human(r.puppy_id)}</strong>
    <span className={"pup-request-state pup-request-"+r.status}>{r.status}</span>
    <small>{time(r.created_at)}</small>
    {r.review_note?<small>Staff note: {r.review_note}</small>:null}
   </div>)}
  </div>}
 </section>;
}
