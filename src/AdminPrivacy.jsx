import React,{useCallback,useEffect,useState} from "react";
import {useWebAccount} from "./native/web/AccountGate.jsx";
export default function AdminPrivacy(){
 const {client}=useWebAccount();
 const [rows,setRows]=useState([]),[error,setError]=useState(""),[busy,setBusy]=useState(false),[reasons,setReasons]=useState({}),[states,setStates]=useState({});
 const request=useCallback(async payload=>{
  const {data,error:authError}=await client.auth.getSession();
  if(authError||!data?.session?.access_token)throw Error("Sign in required");
  const res=await fetch("/api/admin",{method:"POST",cache:"no-store",credentials:"same-origin",
   headers:{"Content-Type":"application/json",Authorization:"Bearer "+data.session.access_token},body:JSON.stringify(payload)});
  const j=await res.json().catch(()=>null);
  if(!res.ok||!j?.ok)throw Error(j?.error||"Privacy administration unavailable");
  return j;
 },[client]);
 const refresh=useCallback(async()=>{try{setRows((await request({action:"privacy-requests"})).requests||[]);setError("");}
  catch(e){setError(e.message);}},[request]);
 useEffect(()=>{void refresh();},[refresh]);
 async function update(row){
  if(busy)return;const reason=(reasons[row.id]||"").trim();
  if(reason.length<5){setError("A review reason of at least five characters is required.");return;}
  setBusy(true);setError("");
  try{await request({action:"privacy-review",requestId:row.id,state:states[row.id]||"in_progress",reason});await refresh();}
  catch(e){setError(e.message);}finally{setBusy(false);}
 }
 return <div className="pup-admin-container"><header className="pup-admin-head"><div>
 <p className="pup-admin-kicker">PUPPY CLICKER · DATA PROTECTION</p><h1>Privacy requests</h1>
 <p>Restricted case review. No automatic account deletion or export is enabled.</p></div>
 <a className="pup-admin-link" href="/account/admin">← Administration</a></header>
 {error?<p role="alert" className="pup-admin-error">{error}</p>:null}
 <section className="pup-admin-panel"><h2>Requests ({rows.length})</h2>
 <p className="pup-admin-note">Review requests before their response deadline. Complete access and export requests only after personally verifying fulfillment. Erasure completion requires a separate verified deletion workflow.</p>
 <button onClick={()=>void refresh()} type="button">Refresh</button>
 {!rows.length?<p>No privacy requests recorded.</p>:rows.map(r=><article key={r.id} className="pup-admin-panel" style={{marginTop:12}}>
 <h3>{r.accountName} · {r.type}</h3><p>Status: {r.state} · Received: {new Date(r.submittedAt).toLocaleString()} · Target: {new Date(r.deadlineAt).toLocaleDateString()}</p>
 {r.note?<p>Player details: {r.note}</p>:null}{r.reviewNote?<p>Prior review: {r.reviewNote}</p>:null}
 {["received","identity_review","awaiting_review","in_progress","ready"].includes(r.state)?<div style={{display:"grid",gap:8}}>
 <label>Review status<select value={states[r.id]||"in_progress"} onChange={e=>setStates(p=>({...p,[r.id]:e.target.value}))}>
 <option value="in_progress">In progress</option><option value="awaiting_review">Needs review</option>
 <option value="denied">Declined with explanation</option>
 {r.type!=="erase"?<option value="completed">Completed after fulfillment</option>:null}
 </select></label>
 <label>Reason / fulfillment record<textarea rows={2} minLength={5} maxLength={500} value={reasons[r.id]||""} onChange={e=>setReasons(p=>({...p,[r.id]:e.target.value}))}/></label>
 <button type="button" disabled={busy} onClick={()=>void update(r)}>Record review</button></div>:null}
 </article>)}</section></div>;
}
