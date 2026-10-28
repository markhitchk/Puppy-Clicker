import React,{useState} from "react";
import {client} from "./supabase.js";

/* Submitting a request never proves ownership and never resets credentials. */
export default function ManualRecovery(){
 const [mode,setMode]=useState("request");
 const [username,setUsername]=useState("");
 const [email,setEmail]=useState("");
 const [issueType,setIssueType]=useState("lost_password");
 const [details,setDetails]=useState("");
 const [website,setWebsite]=useState("");
 const [reference,setReference]=useState("");
 const [lookupReference,setLookupReference]=useState("");
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState("");
 const [ticket,setTicket]=useState(null);
 const request=async e=>{
  e.preventDefault();
  if(busy)return;
  setBusy(true);setNotice("");setTicket(null);
  try{
   if(!client)throw Error("Unavailable");
   const {data,error}=await client.functions.invoke("pup-recovery",{
    body:{action:"request",username:username.trim(),contactEmail:email.trim(),
     issueType,details:details.trim(),website}
   });
   if(error||!data?.accepted||!data.reference)throw Error(data?.error||"REQUEST_FAILED");
   setReference(data.reference);
   setLookupReference(data.reference);
   setDetails("");
   setNotice("Request submitted. Keep your reference number for staff follow-up. This request does not reset your password.");
  }catch(err){
   setNotice(err?.message==="RECOVERY_RATE_LIMITED"
    ?"Too many recovery requests. Please try again later."
    :"We couldn't submit your request right now. No account information has been changed.");
  }finally{setBusy(false);}
 };
 const checkStatus=async e=>{
  e.preventDefault();
  if(busy)return;
  setBusy(true);setNotice("");setTicket(null);
  try{
   if(!client)throw Error("Unavailable");
   const {data,error}=await client.functions.invoke("pup-recovery",{
    body:{action:"status",reference:lookupReference.trim(),contactEmail:email.trim()}
   });
   if(error)throw Error("STATUS_UNAVAILABLE");
   if(!data?.found){setNotice("No matching request was found. Check your reference number and contact email.");return;}
   setTicket({status:data.status,submittedAt:data.submittedAt});
  }catch{setNotice("Could not check your request. Please try again.");}
  finally{setBusy(false);}
 };
 return <section className="portal-card recovery-manual" aria-label="Manual account recovery">
  <p className="eyebrow">🔐 NEED MORE HELP?</p>
  <h2>Request staff-assisted recovery</h2>
  <p>Lost access to your linked Discord account, your password, or your original Android device? You can submit a private recovery request for review. A request alone <strong>cannot</strong> unlock or transfer your account.</p>
  <div className="recovery-manual-tabs" role="group" aria-label="Recovery options">
   <button type="button" className={mode==="request"?"selected":""}
    onClick={()=>{setMode("request");setNotice("");setTicket(null);}}>Submit request</button>
   <button type="button" className={mode==="status"?"selected":""}
    onClick={()=>{setMode("status");setNotice("");setTicket(null);}}>Check request status</button>
  </div>
  {mode==="request"?<form className="profile-form" onSubmit={request}>
   <label htmlFor="manualPupUsername">Pup Account username</label>
   <input id="manualPupUsername" required minLength={3} maxLength={20}
    autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)}
    placeholder="Your existing Pup Account username"/>
   <label htmlFor="manualPupEmail">Contact email for staff follow-up</label>
   <input id="manualPupEmail" type="email" required maxLength={254}
    autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}
    placeholder="Email you can access"/>
   <label htmlFor="manualPupIssue">What happened?</label>
   <select id="manualPupIssue" value={issueType} onChange={e=>setIssueType(e.target.value)}>
    <option value="lost_password">Forgot password</option>
    <option value="lost_discord">Lost access to Discord</option>
    <option value="lost_both">Lost Discord and password</option>
    <option value="device_change">Changed or lost Android device</option>
    <option value="other">Other account access problem</option>
   </select>
   <label htmlFor="manualPupDetails">Details for the support team</label>
   <textarea id="manualPupDetails" required minLength={20} maxLength={1000} rows={5}
    value={details} onChange={e=>setDetails(e.target.value)}
    placeholder="Explain the access issue. Do not include passwords, tokens, or private codes."/>
   <div className="recovery-trap" aria-hidden="true"><label htmlFor="manualPupWebsite">Website</label>
    <input id="manualPupWebsite" tabIndex={-1} autoComplete="off"
     value={website} onChange={e=>setWebsite(e.target.value)}/></div>
   <button className="cta cta-primary" type="submit" disabled={busy}>
    {busy?"Submitting securely…":"Submit recovery request"}
   </button>
  </form>:<form className="profile-form" onSubmit={checkStatus}>
   <label htmlFor="manualReference">Recovery reference</label>
   <input id="manualReference" required value={lookupReference}
    onChange={e=>setLookupReference(e.target.value)} placeholder="PUP-RC-…" autoComplete="off"/>
   <label htmlFor="manualLookupEmail">Contact email used for the request</label>
   <input id="manualLookupEmail" required type="email" value={email}
    onChange={e=>setEmail(e.target.value)} autoComplete="email"/>
   <button className="cta cta-primary" type="submit" disabled={busy}>
    {busy?"Checking…":"Check status"}
   </button>
  </form>}
  {reference&&mode==="request"?<p className="recovery-reference"><span>Keep this reference:</span> <strong>{reference}</strong></p>:null}
  {ticket?<p className="portal-message" role="status">Request status: <strong>{ticket.status?.replace(/_/g," ")}</strong>{ticket.submittedAt?" · submitted "+new Date(ticket.submittedAt).toLocaleString():""}</p>:null}
  {notice?<p className="portal-message" role="status">{notice}</p>:null}
  <p className="recovery-helper">Support must verify ownership independently. Contact email is not automatically trusted, and staff will never request your password. Do not submit payment details, access tokens, or recovery codes.</p>
 </section>;
}
