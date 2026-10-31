import React,{useCallback,useEffect,useMemo,useState} from "react";
import WebAccountGate,{useWebAccount} from "./native/web/AccountGate.jsx";
import {createChatClient} from "./communityChatClient.js";
import {useLanguage} from "./LanguagePicker.jsx";
import "./CommunityChat.css";
function CommunityChatBody(){
 const {client}=useWebAccount(),request=useMemo(()=>createChatClient(client),[client]);
 const {t:tr}=useLanguage();
 const [catalog,setCatalog]=useState(null),[channel,setChannel]=useState(null);
 const [messages,setMessages]=useState({items:[],own:[]});
 const [body,setBody]=useState(""),[busy,setBusy]=useState(false);
 const [error,setError]=useState(""),[notice,setNotice]=useState("");
 const load=useCallback(async()=>{
  try{const data=await request("channels");setCatalog(data);
   setChannel(old=>old||data.channels[0]?.id||null);setError("");
  }catch(e){setError(e.message==="CHAT_NOT_LAUNCHED"?"Community chat is not open yet. Moderation and safety checks are being completed.":e.message);}
 },[request]);
 useEffect(()=>{void load();},[load]);
 const refresh=useCallback(async()=>{
  const selected=catalog?.channels.find(c=>c.id===channel);
  if(!selected||!catalog.joinedServerIds.includes(selected.server_id))return;
  try{setMessages(await request("messages",{channelId:channel}));}
  catch(e){setError(e.message);}
 },[channel,catalog,request]);
 useEffect(()=>{
  void refresh();
  const poll=setInterval(()=>{if(document.visibilityState==="visible")void refresh();},5000);
  const resume=()=>{if(document.visibilityState==="visible")void refresh();};
  document.addEventListener("visibilitychange",resume);
  return()=>{clearInterval(poll);document.removeEventListener("visibilitychange",resume);};
 },[refresh]);
 const action=async(name,params)=>{
  setBusy(true);setError("");
  try{const result=await request(name,params,"POST");setNotice(result.notice||"Action completed.");
   await load();await refresh();return true;}
  catch(e){setError(e.message==="CHAT_RATE_LIMIT"?"Please slow down before submitting another message.":e.message);return false;}
  finally{setBusy(false);}
 };
 const send=async event=>{
  event.preventDefault();if(busy||!body.trim())return;
  const sent=await action("send",{channelId:channel,text:body.trim(),clientKey:crypto.randomUUID()});
  if(sent)setBody("");
 };
 const report=async id=>{
  const reason=window.prompt("Why should staff review this message? (3–300 characters)");
  if(reason)await action("report",{messageId:id,reason});
 };
 const blockAuthor=async id=>{
  if(!window.confirm("Hide this player's messages? Contact support to remove a block."))return;
  await action("block",{messageId:id,blocked:true});
  await refresh();
 };
 const selected=catalog?.channels.find(c=>c.id===channel);
 const joined=catalog?.joinedServerIds.includes(selected?.server_id);
 return <div className="community-chat-page">
  <header className="community-chat-header"><p className="eyebrow">🐾 PUPPY CLICKER · PUPEYE</p>
   <h1>💬 {tr("chat")}</h1>
   <p>{tr("chatSafety")}</p>
  </header>
  {error?<p role="alert" className="community-chat-alert">{error}</p>:null}
  {notice?<p role="status" className="community-chat-note">{notice}</p>:null}
  {catalog?<div className="community-chat-grid">
   <aside className="community-chat-channels" aria-label="Community channels"><h2>Official community</h2>
    {catalog.channels.map(c=><button key={c.id} type="button" aria-pressed={c.id===channel}
     onClick={()=>{setChannel(c.id);setMessages({items:[],own:[]});}}># {c.slug}</button>)}
   </aside>
   <section className="community-chat-room"><h2># {selected?.title||"Select a channel"}</h2>
    {!catalog.rulesAccepted?<div className="community-chat-rules">
     <h3>{tr("communityRules")}</h3>
     <p>{tr("rulesBody")}</p>
     <button className="cta cta-primary" disabled={busy} type="button" onClick={()=>void action("accept-rules",{})}>{tr("agreeRules")}</button>
     <p><a href="/legal/privacy">Privacy Policy</a> · <a href="/legal/terms">Terms</a></p>
    </div>:!joined?<div className="community-chat-rules">
     <p>{tr("communityJoin")}</p>
     <button className="cta cta-primary" disabled={busy} onClick={()=>void action("join",{serverId:selected.server_id})}>{tr("joinCommunity")}</button>
    </div>:<>
     <div className="community-chat-messages" role="log" aria-live="off">
      {messages.items.length?messages.items.slice().reverse().map(m=><article className="community-chat-message" key={m.id}>
       <div><strong>{m.sender}</strong><small>{new Date(m.createdAt).toLocaleString()}</small></div>
       <p>{m.body}</p><div className="community-chat-message-actions"><button type="button" onClick={()=>void report(m.id)}>{tr("report")}</button><button type="button" onClick={()=>void blockAuthor(m.id)}>{tr("block")}</button></div>
      </article>):<p>{tr("noMessages")}</p>}
     </div>
     {messages.own.length?<details className="community-chat-own"><summary>{tr("heldMessages")} ({messages.own.length})</summary>
      {messages.own.map(m=><article key={m.id}><small>{m.status}</small><p>{m.body}</p>{m.reason?<small>{m.reason}</small>:null}</article>)}
     </details>:null}
     {selected.writable?<form onSubmit={send} className="community-chat-form">
      <label htmlFor="chat-text">{tr("yourMessage")}</label>
      <textarea id="chat-text" rows={3} maxLength={300} required value={body}
       onChange={e=>setBody(e.target.value)} placeholder={tr("writeMessage")}/>
      <button className="cta cta-primary" type="submit" disabled={!body.trim()||busy}>{tr("sendReview")}</button>
      <small>{tr("approvalNotice")}</small>
     </form>:<p className="community-chat-note">{tr("announcementsReadonly")}</p>}
    </>}
   </section>
  </div>:null}
 </div>;
}
export default function CommunityChat(){return <WebAccountGate><CommunityChatBody/></WebAccountGate>;}
