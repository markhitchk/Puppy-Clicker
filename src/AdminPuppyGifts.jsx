import React,{useCallback,useEffect,useState} from "react";
import {pupWebApi} from "./pupWebApi.js";
import "./admin-puppy-gifts.css";
const human=id=>(id||"").replace(/^v[0-9]_/, "").replaceAll("_"," ");
const friendlyError=code=>({
 PUPPY_ALREADY_OWNED:"That player already owns this puppy.",
 TARGET_CLOUD_SAVE_REQUIRED:"The player must first create a cloud save.",
 GIFT_SAVE_CONFLICT:"Their save changed during gifting. Refresh and retry.",
 REQUEST_NOT_PENDING:"The request was already reviewed.",
 DEVELOPER_GIFT_REQUIRED:"Only Developers can grant bound or restricted puppies.",
 ACCOUNT_BANNED:"This account is banned."
})[code]||("Action failed: "+code);
export default function AdminPuppyGifts({request:adminRequest,role}){
 const [users,setUsers]=useState([]);
 const [puppies,setPuppies]=useState([]);
 const [requests,setRequests]=useState([]);
 const [playerId,setPlayerId]=useState("");
 const [puppyId,setPuppyId]=useState("");
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState("");
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(true);
 const refresh=useCallback(async()=>{
  setLoading(true);
  try{
   const [directory,catalog,pending]=await Promise.all([
    adminRequest({action:"users"}),pupWebApi({action:"catalog"}),pupWebApi({action:"staff-requests"})
   ]);
   const eligible=(directory.users||[]).filter(u=>u.status==="active");
   const permitted=(catalog.puppies||[]).filter(p=>role==="DEVELOPER"||p.giftable&&!p.bound);
   setUsers(eligible);setPuppies(permitted);setRequests(pending.requests||[]);
   setPlayerId(old=>eligible.some(x=>x.id===old)?old:eligible[0]?.id||"");
   setPuppyId(old=>permitted.some(x=>x.puppy_id===old)?old:permitted[0]?.puppy_id||"");
  }catch{setError("Could not load the staff gifting service.");}
  finally{setLoading(false);}
 },[adminRequest,role]);
 useEffect(()=>{void refresh();},[refresh]);
 const run=async(body,success)=>{
  setError("");setNotice("");setBusy(true);
  try{
   const result=await pupWebApi(body);
   setNotice(success+(result.warnings?.length?" Note: "+result.warnings.join("; "):""));
   await refresh();
  }catch(e){setError(friendlyError(e.message));}
  finally{setBusy(false);}
 };
 const gift=event=>{
  event.preventDefault();
  const target=users.find(x=>x.id===playerId);
  const pup=puppies.find(x=>x.puppy_id===puppyId);
  if(!target||!pup)return;
  if(!window.confirm("Grant "+puppyId+" to @"+target.username+" from the system? This permanently modifies their cloud save."))return;
  void run({action:"gift",targetPlayerId:playerId,puppyId},"Puppy granted to "+target.username+".");
 };
 const approve=r=>{
  if(!window.confirm("Approve and grant "+r.puppy_id+" to @"+r.username+"?"))return;
  void run({action:"gift",targetPlayerId:r.player_uuid,puppyId:r.puppy_id,requestId:r.id},"Request approved and puppy granted.");
 };
 const decline=r=>{
  const note=window.prompt("Reason for declining this request (optional):","");
  if(note===null)return;
  void run({action:"decline",requestId:r.id,note:note.slice(0,400)},"Request declined.");
 };
 const pending=requests.filter(r=>r.status==="pending");
 return <section className="pup-admin-panel pup-admin-gifts">
  <div className="pup-admin-section-heading"><h2>🎁 System puppy gifts</h2>
   <button type="button" onClick={()=>void refresh()} disabled={busy||loading}>↻ Refresh gifts</button></div>
  <p className="pup-admin-note">Issue a single puppy to a registered player through an audited cloud-save update. Developer-only / bound puppies require the Developer role. No friendship connection is necessary for staff-issued gifts.</p>
  {loading?<p role="status">Loading gifting options…</p>:null}
  <form className="pup-admin-gift-form" onSubmit={gift}>
   <label htmlFor="gift-player">Recipient Pup Account</label>
   <select id="gift-player" value={playerId} onChange={e=>setPlayerId(e.target.value)} required>
    {users.map(user=><option key={user.id} value={user.id}>@{user.username} · {user.friendCode||"No friend code"}</option>)}
   </select>
   <label htmlFor="gift-puppy">System puppy</label>
   <select id="gift-puppy" value={puppyId} onChange={e=>setPuppyId(e.target.value)} required>
    {puppies.map(p=><option key={p.puppy_id} value={p.puppy_id}>{human(p.puppy_id)} ({p.puppy_id}){p.bound||!p.giftable?" · Developer only":""}</option>)}
   </select>
   <button type="submit" disabled={busy||loading||!playerId||!puppyId}>Grant system puppy</button>
  </form>
  {error?<p role="alert" className="pup-admin-error">{error}</p>:null}
  {notice?<p role="status" className="pup-admin-success">{notice}</p>:null}
  <h3>Player requests ({pending.length} pending)</h3>
  {requests.length===0?<p className="pup-admin-empty">No puppy requests yet.</p>:<div className="pup-admin-gift-requests">
   {requests.map(r=><article className="pup-admin-gift-row" key={r.id}>
    <div><strong>@{r.username} · {human(r.puppy_id)}</strong><small>{new Date(r.created_at).toLocaleString()} · {r.status}</small>
     {r.note?<p>{r.note}</p>:null}{r.review_note?<p>Staff note: {r.review_note}</p>:null}</div>
    {r.status==="pending"?<div className="pup-admin-gift-actions">
     <button disabled={busy||loading} type="button" onClick={()=>approve(r)}>Approve &amp; gift</button>
     <button disabled={busy||loading} type="button" onClick={()=>decline(r)}>Decline</button>
    </div>:null}
   </article>)}
  </div>}
 </section>;
}
