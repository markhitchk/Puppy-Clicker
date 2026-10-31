import React,{useCallback,useEffect,useMemo,useState} from "react";
import WebAccountGate,{useWebAccount} from "./native/web/AccountGate.jsx";
import {createChatClient} from "./communityChatClient.js";
import "./CommunityChat.css";
function StaffChat(){
 const {client}=useWebAccount(),request=useMemo(()=>createChatClient(client),[client]);
 const [queue,setQueue]=useState([]),[reports,setReports]=useState([]),[busy,setBusy]=useState(null);
 const [reasons,setReasons]=useState({}),[reportReasons,setReportReasons]=useState({}),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const refresh=useCallback(async()=>{
  try{const [data,reportData]=await Promise.all([request("queue"),request("reports")]);setQueue(data.pending||[]);setReports(reportData.reports||[]);setError("");}
  catch(e){setError(e.message==="CHAT_NOT_LAUNCHED"?"Chat moderation is not enabled for production.":"Unable to load moderation: "+e.message);}
 },[request]);
 useEffect(()=>{
  void refresh();
  const timer=setInterval(()=>{if(document.visibilityState==="visible")void refresh();},5000);
  return()=>clearInterval(timer);
 },[refresh]);
 const review=async(messageId,decision)=>{
  const reason=(reasons[messageId]||"").trim();
  if(reason.length<3){setError("Enter a decision reason of at least three characters.");return;}
  setBusy(messageId);setError("");setNotice("");
  try{
   await request("review",{messageId,decision,reason},"POST");
   setNotice("Moderation action and audit recorded.");
   setReasons(old=>({...old,[messageId]:""}));await refresh();
  }catch(e){setError(e.message);}finally{setBusy(null);}
 };
 const resolve=async reportId=>{
  const reason=(reportReasons[reportId]||"").trim();
  if(reason.length<3){setError("A report resolution reason is required.");return;}
  setBusy(reportId);setError("");
  try{await request("resolve-report",{reportId,reason},"POST");setNotice("Report resolution audited.");
   setReportReasons(old=>({...old,[reportId]:""}));await refresh();}
  catch(e){setError(e.message);}finally{setBusy(null);}
 };
 const removeReported=async report=>{
  const reason=(reportReasons[report.id]||"").trim();
  if(reason.length<3){setError("Enter a reason before removing reported content.");return;}
  setBusy(report.id);setError("");
  try{
   await request("review",{messageId:report.messageId,decision:"remove",reason},"POST");
   await request("resolve-report",{reportId:report.id,reason},"POST");
   setNotice("Reported message removed and both actions audited.");
   setReportReasons(old=>({...old,[report.id]:""}));await refresh();
  }catch(e){setError(e.message);}finally{setBusy(null);}
 };
 return <div className="community-chat-page staff-chat-page">
  <header className="community-chat-header"><p className="eyebrow">PUPPY CLICKER · PUPEYE</p>
   <h1>🛡️ Chat moderation</h1>
   <p>Approve or reject each held message after reviewing its meaning and context. Automatic flags are review aids, not a substitute for moderation. All decisions require a recorded reason.</p>
   <a href="/account/admin">Back to Administration</a>
  </header>
  {error?<p className="community-chat-alert" role="alert">{error}</p>:null}
  {notice?<p className="community-chat-note" role="status">{notice}</p>:null}
  <section className="community-chat-staff-queue"><h2>Pending messages ({queue.length})</h2>
   {!queue.length?<p>No pending messages returned.</p>:queue.map(m=><article key={m.id} className="community-chat-message staff-chat-item">
    <div><strong>{m.displayName||m.username} (@{m.username})</strong>
     <small>{new Date(m.createdAt).toLocaleString()}</small></div>
    <p>{m.body}</p><p>Screening: {m.codes?.length?m.codes.join(", "):"No rule matched. Manual review still required."}</p>
    <label>Reason
     <textarea rows={2} maxLength={300} value={reasons[m.id]||""}
      onChange={e=>setReasons(old=>({...old,[m.id]:e.target.value}))}/>
    </label>
    <div className="community-chat-staff-actions">
     <button type="button" disabled={busy===m.id} onClick={()=>void review(m.id,"approve")}>Approve & publish</button>
     <button type="button" disabled={busy===m.id} onClick={()=>void review(m.id,"reject")}>Reject</button>
    </div>
   </article>)}
  </section>
  <section className="community-chat-staff-queue" aria-label="Reported messages">
   <h2>Open player reports ({reports.length})</h2>
   {!reports.length?<p>No open player reports.</p>:reports.map(r=><article className="community-chat-message staff-chat-item" key={r.id}>
    <div><strong>Reported by @{r.reporter}</strong><small>{new Date(r.createdAt).toLocaleString()}</small></div>
    <p>Reason: {r.reason}</p><p>Message ({r.messageStatus}): {r.body}</p>
    <label>Review resolution reason
     <textarea maxLength={300} rows={2} value={reportReasons[r.id]||""}
      onChange={e=>setReportReasons(old=>({...old,[r.id]:e.target.value}))}/>
    </label>
    <div className="community-chat-staff-actions">
     {r.messageStatus==="published"?<button type="button" disabled={busy===r.id} onClick={()=>void removeReported(r)}>Remove reported message</button>:null}
     <button type="button" disabled={busy===r.id} onClick={()=>void resolve(r.id)}>Resolve report</button>
    </div>
   </article>)}
  </section>
 </div>;
}
export default function AdminChat(){return <WebAccountGate><StaffChat/></WebAccountGate>;}
