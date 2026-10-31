import React,{useCallback,useEffect,useMemo,useState} from "react";
import WebAccountGate,{useWebAccount} from "./native/web/AccountGate.jsx";
import {createChatClient} from "./communityChatClient.js";
import "./CommunityChat.css";
function StaffChat(){
 const {client}=useWebAccount(),request=useMemo(()=>createChatClient(client),[client]);
 const [queue,setQueue]=useState([]),[busy,setBusy]=useState(null);
 const [reasons,setReasons]=useState({}),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const refresh=useCallback(async()=>{
  try{const data=await request("queue");setQueue(data.pending||[]);setError("");}
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
 </div>;
}
export default function AdminChat(){return <WebAccountGate><StaffChat/></WebAccountGate>;}
