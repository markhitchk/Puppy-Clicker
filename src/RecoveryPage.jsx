import React,{useEffect,useState} from "react";
import {client} from "./native/supabase.js";
import {beginPuppyDiscord,verifyPuppySession} from "./native/web/puppyOAuth.js";

const ISSUES=[
 ["lost_password","Forgot my Pup password"],
 ["lost_discord","Lost access to Discord"],
 ["lost_both","Cannot access either login"],
 ["device_change","New phone or lost Android device"],
 ["other","Other account access issue"]
];
const supportStates={
 pending:"Waiting for staff review",
 in_review:"Under staff review",
 resolved:"Resolved",
 rejected:"Closed after review"
};
export default function RecoveryPage(){
 const [checking,setChecking]=useState(true);
 const [account,setAccount]=useState(null);
 const [discordBusy,setDiscordBusy]=useState(false);
 const [authMessage,setAuthMessage]=useState("");
 const [newPassword,setNewPassword]=useState("");
 const [confirmPassword,setConfirmPassword]=useState("");
 const [resetBusy,setResetBusy]=useState(false);
 const [resetMessage,setResetMessage]=useState("");
 const [username,setUsername]=useState("");
 const [contactEmail,setContactEmail]=useState("");
 const [issueType,setIssueType]=useState("lost_password");
 const [details,setDetails]=useState("");
 const [website,setWebsite]=useState("");
 const [sending,setSending]=useState(false);
 const [requestMessage,setRequestMessage]=useState("");
 const [reference,setReference]=useState("");
 const [lookupReference,setLookupReference]=useState("");
 const [lookupEmail,setLookupEmail]=useState("");
 const [lookupBusy,setLookupBusy]=useState(false);
 const [lookupStatus,setLookupStatus]=useState("");
 useEffect(()=>{
  let active=true;
  const readSession=async()=>{
   if(!client){if(active){setChecking(false);setAuthMessage("Pup Account service is temporarily unavailable.");}return;}
   try{
    const session=await client.auth.getUser();
    if(session.error||!session.data?.user)throw Error("NO_SESSION");
    const verified=await verifyPuppySession(client);
    if(active)setAccount(verified);
   }catch{
    if(active)setAccount(null);
   }finally{
    if(active)setChecking(false);
   }
  };
  void readSession();
  const {data}=client?.auth.onAuthStateChange(()=>{
   queueMicrotask(()=>{if(active)void readSession();});
  })||{};
  return()=>{active=false;data?.subscription?.unsubscribe();};
 },[]);
 const discordRecovery=async()=>{
  if(discordBusy)return;
  setDiscordBusy(true);setAuthMessage("");
  try{
   globalThis.sessionStorage?.setItem("puppy-web-discord-return-v1","/recovery");
   const url=await beginPuppyDiscord();
   window.location.assign(url);
  }catch{
   setAuthMessage("Unable to open Discord authorization. Check your connection and try again.");
   setDiscordBusy(false);
  }
 };
 const resetPassword=async event=>{
  event.preventDefault();
  if(resetBusy||!account)return;
  if(newPassword.length<8||newPassword.length>128){
   setResetMessage("Use a password between 8 and 128 characters.");return;
  }
  if(newPassword!==confirmPassword){
   setResetMessage("Passwords must match.");return;
  }
  setResetBusy(true);setResetMessage("");
  try{
   // Recheck the live Pup Account link; any unrelated Supabase session
   // must never be permitted to use this account recovery surface.
   await verifyPuppySession(client);
   const {error}=await client.auth.updateUser({password:newPassword});
   if(error)throw error;
   setResetMessage("Password updated. You can now sign in using your Pup username.");
  }catch{
   setResetMessage("The password could not be updated. Please sign in again with Discord or contact support.");
  }finally{
   setNewPassword("");setConfirmPassword("");setResetBusy(false);
  }
 };
 const submitRequest=async event=>{
  event.preventDefault();
  if(sending)return;
  if(!/^[A-Za-z0-9_-]{3,20}$/.test(username.trim())){
   setRequestMessage("Enter a valid Pup Account username.");return;
  }
  if(details.trim().length<20||details.trim().length>1000){
   setRequestMessage("Describe the access problem in 20–1000 characters.");return;
  }
  setSending(true);setRequestMessage("");
  try{
   if(!client)throw Error("SERVICE_UNAVAILABLE");
   const {data,error}=await client.functions.invoke("pup-recovery",{body:{
    action:"request",username:username.trim(),contactEmail:contactEmail.trim(),
    issueType,details:details.trim(),website
   }});
   if(error||data?.accepted!==true)throw Error(data?.error||"REQUEST_FAILED");
   if(!data.reference)throw Error("REQUEST_NOT_ACCEPTED");
   setReference(data.reference);
   setLookupReference(data.reference);setLookupEmail(contactEmail.trim());
   setRequestMessage("Your request was stored for manual staff review. Save this reference. No automatic email is sent.");
   setDetails("");
  }catch(e){
   setRequestMessage(e?.message==="RECOVERY_RATE_LIMITED"
    ?"Request limit reached. Please try again after 24 hours."
    :"Could not submit the request. Check the information and try again.");
  }finally{setSending(false);}
 };
 const checkStatus=async event=>{
  event.preventDefault();
  if(lookupBusy)return;
  setLookupBusy(true);setLookupStatus("");
  try{
   if(!client)throw Error("SERVICE_UNAVAILABLE");
   const {data,error}=await client.functions.invoke("pup-recovery",{body:{
    action:"status",reference:lookupReference.trim().toUpperCase(),
    contactEmail:lookupEmail.trim()
   }});
   if(error)throw Error("LOOKUP_FAILED");
   setLookupStatus(data?.found
    ?supportStates[data.status]||"Status unavailable"
    :"No matching reference and contact email were found.");
  }catch{setLookupStatus("Unable to check request status. Try again.");}
  finally{setLookupBusy(false);}
 };
 return <div className="account-content recovery-content">
  <div className="account-heading">
   <p className="eyebrow">🔐 PUP ACCOUNT · SECURE RECOVERY</p>
   <h1>Recover your Pup Account</h1>
   <p>Restore account access without creating a new player or losing your linked Android game progress.</p>
  </div>
  <div className="recovery-grid">
   <section className="portal-card">
    <div className="recovery-step">01 · FASTEST OPTION</div>
    <h2>🐾 Recover with Discord</h2>
    {checking?<p role="status">Checking your current Pup Account session…</p>:
     account?<div className="recovery-verified">
      <p className="recovery-success">✓ Verified account: <strong>@{account.username}</strong></p>
      <p>Your username is shown above. Password reset is available only for this verified Pup Account.</p>
      {account.passwordLoginEnabled?
       <form className="profile-form" onSubmit={resetPassword}>
        <label htmlFor="recoverNewPassword">New password</label>
        <input id="recoverNewPassword" type="password" minLength={8} maxLength={128}
         required autoComplete="new-password" value={newPassword}
         onChange={e=>setNewPassword(e.target.value)}/>
        <label htmlFor="recoverConfirmPassword">Confirm new password</label>
        <input id="recoverConfirmPassword" type="password" minLength={8} maxLength={128}
         required autoComplete="new-password" value={confirmPassword}
         onChange={e=>setConfirmPassword(e.target.value)}/>
        <button className="cta cta-primary stretch" type="submit" disabled={resetBusy}>
         {resetBusy?"Updating password…":"Reset Pup Account password"}
        </button>
       </form>:
       <p>Password login is not set up yet. <a className="recovery-link" href="/account">Add it under Account Management</a> after verifying your account.</p>}
      {resetMessage?<p className="portal-message" role="status">{resetMessage}</p>:null}
      <a className="cta cta-secondary stretch" href="/account">Manage account settings</a>
     </div>:
     <>
      <p>If your Discord is still linked, sign in securely and we'll show your Pup username and let you reset your password.</p>
      <button className="cta cta-primary stretch" type="button" disabled={discordBusy}
       onClick={()=>void discordRecovery()}>
       {discordBusy?"Opening Discord…":"Continue with Puppy Clicker Discord"}
      </button>
      <p className="recovery-footnote">You must authorize the same Discord identity already linked to your Pup Account. Discord is never automatically linked to an unrelated account.</p>
     </>}
    {authMessage?<p className="portal-message" role="alert">{authMessage}</p>:null}
   </section>
   <section className="portal-card">
    <div className="recovery-step">02 · NO ACCESS TO DISCORD?</div>
    <h2>🛟 Request manual recovery</h2>
    <p>Can't access your password or linked Discord account? Submit a private support request. Staff must independently verify account ownership before making changes.</p>
    {reference?<div className="recovery-receipt" role="status">
      <small>YOUR RECOVERY REFERENCE</small>
      <strong>{reference}</strong>
      <p>Save this number to check your request. This is not a login code and does not grant account access.</p>
     </div>:null}
    <form className="profile-form" onSubmit={submitRequest}>
     <label htmlFor="recoverUsername">Pup Account username</label>
     <input id="recoverUsername" value={username} onChange={e=>setUsername(e.target.value)}
      required maxLength={20} autoCapitalize="none" autoComplete="username" placeholder="Your previous or current username"/>
     <label htmlFor="recoverContactEmail">Contact email for a manual staff response</label>
     <input id="recoverContactEmail" type="email" value={contactEmail}
      onChange={e=>setContactEmail(e.target.value)} required maxLength={254}
      autoComplete="email" placeholder="you@example.com"/>
     <label htmlFor="recoverIssue">What happened?</label>
     <select id="recoverIssue" value={issueType} onChange={e=>setIssueType(e.target.value)}>
      {ISSUES.map(([value,label])=><option key={value} value={value}>{label}</option>)}
     </select>
     <label htmlFor="recoverDetails">Describe the problem</label>
     <textarea id="recoverDetails" value={details} onChange={e=>setDetails(e.target.value)}
      rows={5} minLength={20} maxLength={1000} required
      placeholder="Tell support what happened and what account access you still have. Do not include passwords or recovery codes."/>
     <div className="recovery-honeypot" aria-hidden="true">
      <label htmlFor="recoverWebsite">Website</label>
      <input id="recoverWebsite" value={website} onChange={e=>setWebsite(e.target.value)}
       tabIndex={-1} autoComplete="off"/>
     </div>
     <button className="cta cta-secondary stretch" type="submit" disabled={sending}>
      {sending?"Submitting securely…":"Submit recovery request"}
     </button>
    </form>
    {requestMessage?<p className="portal-message" role="status">{requestMessage}</p>:null}
    <p className="recovery-footnote">A contact email is not proof of ownership. No automated reset links or support emails are sent. Do not submit passwords, one-time codes, or private save files.</p>
   </section>
  </div>
  <section className="portal-card recovery-status-card">
   <div><div className="recovery-step">03 · REQUEST STATUS</div>
    <h2>Check recovery request</h2>
    <p>Use the reference provided when you submitted the request and the contact email you entered.</p></div>
   <form className="profile-form" onSubmit={checkStatus}>
    <label htmlFor="recoveryReference">Recovery reference</label>
    <input id="recoveryReference" value={lookupReference}
     onChange={e=>setLookupReference(e.target.value)} placeholder="PUP-RC-…"
     autoCapitalize="characters" autoComplete="off" required/>
    <label htmlFor="recoveryLookupEmail">Contact email</label>
    <input id="recoveryLookupEmail" type="email" value={lookupEmail}
     onChange={e=>setLookupEmail(e.target.value)} autoComplete="email" required/>
    <button className="cta cta-primary stretch" type="submit" disabled={lookupBusy}>
     {lookupBusy?"Checking…":"Check request status"}
    </button>
    {lookupStatus?<p className="portal-message" role="status">{lookupStatus}</p>:null}
   </form>
  </section>
 </div>;
}
