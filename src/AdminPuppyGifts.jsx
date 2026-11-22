import React,{useCallback,useEffect,useState} from "react";
import {pupWebApi} from "./pupWebApi.js";
const rewardTypes=[["puppy","Puppy"],["treats","Treats"],["bones_v7","Bones"],["pup_coins_v7","Pup Coins"],["casino_chips_v7","Casino Chips"],...["common","uncommon","rare","epic","legendary"].map(r=>["upgrade_ticket_"+r,r[0].toUpperCase()+r.slice(1)+" Upgrade Ticket"])];
const human=id=>(id||"").replace(/^v[0-9]_/, "").replaceAll("_"," ");
const friendlyError=code=>({
 PUPPY_ALREADY_OWNED:"That player already owns this puppy.",
 TARGET_CLOUD_SAVE_REQUIRED:"The player must first create a cloud save.",
 GIFT_SAVE_CONFLICT:"Their save changed during gifting. Refresh and retry.",
 REQUEST_NOT_PENDING:"The request was already reviewed.",
 OWNER_REQUIRED:"Only HarleyTG can grant restricted puppies.",
 ACCOUNT_BANNED:"This account is banned."
})[code]||("Action failed: "+code);
export default function AdminPuppyGifts({request:adminRequest,role}){
 const [users,setUsers]=useState([]);
 const [puppies,setPuppies]=useState([]);
 const [requests,setRequests]=useState([]);
 const [playerId,setPlayerId]=useState("");
 const [puppyId,setPuppyId]=useState("");
 const [rewardKey,setRewardKey]=useState("puppy"),[amount,setAmount]=useState("1");
 const maxAmount=rewardKey.startsWith("upgrade_ticket_")?100:rewardKey==="treats"?10000:1000;
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
   const permitted=catalog.puppies||[];
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
  if(!target||(rewardKey==="puppy"&&!pup))return;
  const count=Number(amount);
  if(rewardKey!=="puppy"&&(!Number.isSafeInteger(count)||count<1||count>maxAmount))return;
  const reason=window.prompt("Reason for this gift","System gift")?.trim();
  if(!reason)return;
  const label=rewardKey==="puppy"?puppyId:count+" "+rewardTypes.find(([k])=>k===rewardKey)[1];
  if(!window.confirm("Send "+label+" to @"+target.username+" from the system? They must claim it in Notifications."))return;
  void run({action:"gift",targetPlayerId:playerId,rewardKey,...(rewardKey==="puppy"?{puppyId}:{amount:count}),reason,operationId:crypto.randomUUID()},"Gift notification sent to "+target.username+".");
 };
 const approve=r=>{
  if(!window.confirm("Approve and send "+r.puppy_id+" to @"+r.username+"?"))return;
  void run({action:"gift",targetPlayerId:r.player_uuid,puppyId:r.puppy_id,requestId:r.id},"Request approved and gift sent to Notifications.");
 };
 const decline=r=>{
  const note=window.prompt("Reason for declining this request (optional):","");
  if(note===null)return;
  void run({action:"decline",requestId:r.id,note:note.slice(0,400)},"Request declined.");
 };
 const pending=requests.filter(r=>r.status==="pending");
 return <section className="pup-admin-panel pup-admin-gifts">
  <div className="pup-admin-section-heading"><h2>🎁 System gifts</h2>
   <button type="button" onClick={()=>void refresh()} disabled={busy||loading}>↻ Refresh gifts</button></div>
  <p className="pup-admin-note">Send one puppy, ticket or currency reward to a registered player through an audited gift notification. Their collection updates only when they claim it. Restricted gifts require HarleyTG’s verified account. No friendship connection is necessary for staff-issued gifts.</p>
  {loading?<p role="status">Loading gifting options…</p>:null}
  <form className="pup-admin-gift-form" onSubmit={gift}>
   <label htmlFor="gift-player">Recipient Pup Account</label>
   <select id="gift-player" value={playerId} onChange={e=>setPlayerId(e.target.value)} required>
    {users.map(user=><option key={user.id} value={user.id}>@{user.username} · {user.friendCode||"No friend code"}</option>)}
   </select>
   <label htmlFor="gift-type">Reward type</label>
   <select id="gift-type" value={rewardKey} onChange={e=>{setRewardKey(e.target.value);setAmount("1");}}>
    {rewardTypes.map(([key,label])=><option key={key} value={key}>{label}</option>)}
   </select>
   {rewardKey==="puppy"?<><label htmlFor="gift-puppy">System puppy</label>
   <select id="gift-puppy" value={puppyId} onChange={e=>setPuppyId(e.target.value)} required>
    {puppies.map(p=><option key={p.puppy_id} value={p.puppy_id}>{human(p.puppy_id)} ({p.puppy_id}){p.bound||!p.giftable?" · Developer only":""}</option>)}
   </select>
   </>:<><label htmlFor="gift-amount">Amount (maximum {maxAmount})</label>
   <input id="gift-amount" type="number" min={1} max={maxAmount} step={1} required value={amount} onChange={e=>setAmount(e.target.value)}/></>}
   <button type="submit" disabled={busy||loading||!playerId||(rewardKey==="puppy"?!puppyId:!Number.isSafeInteger(Number(amount))||Number(amount)<1||Number(amount)>maxAmount)}>Send gift notification</button>
  </form>
  {error?<p role="alert" className="pup-admin-error">{error}</p>:null}
  {notice?<p role="status" className="pup-admin-success">{notice}</p>:null}
  <h3>Player requests ({pending.length} pending)</h3>
  {requests.length===0?<p className="pup-admin-empty">No puppy requests yet.</p>:<div className="pup-admin-gift-requests">
   {requests.map(r=><article className="pup-admin-gift-row" key={r.id}>
    <div><strong>@{r.username} · {human(r.puppy_id)}</strong><small>{new Date(r.created_at).toLocaleString()} · {r.status}</small>
     {r.note?<p>{r.note}</p>:null}{r.review_note?<p>Staff note: {r.review_note}</p>:null}</div>
    {r.status==="pending"?<div className="pup-admin-gift-actions">
     <button disabled={busy||loading} type="button" onClick={()=>approve(r)}>Approve &amp; send gift</button>
     <button disabled={busy||loading} type="button" onClick={()=>decline(r)}>Decline</button>
    </div>:null}
   </article>)}
  </div>}
 </section>;
}
