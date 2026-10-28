import React,{useState} from "react";
import {useWebAccount} from "./native/web/AccountGate.jsx";
import "./recovery.css";

export default function RecoveryPage(){
 const {client,pupAccount,signOut}=useWebAccount();
 const [password,setPassword]=useState("");
 const [confirmation,setConfirmation]=useState("");
 const [busy,setBusy]=useState(false);
 const [result,setResult]=useState("");
 const [complete,setComplete]=useState(false);
 const username=pupAccount?.username||"";
 const reset=async event=>{
  event.preventDefault();
  if(busy)return;
  if(password.length<8||password.length>128){
   setResult("Choose a password containing 8–128 characters.");
   return;
  }
  if(password!==confirmation){
   setResult("The passwords do not match.");
   return;
  }
  setBusy(true);setResult("");setComplete(false);
  let passwordUpdated=false;
  try{
   // Server verifies this session's Pup Account and reserved username.
   // This flow never accepts an arbitrary player ID or Discord ID.
   const check=await client.functions.invoke("pup-web-auth",{
    body:{action:"credential-check",username}
   });
   if(check.error||check.data?.available!==true)
    throw new Error("PUP_RECOVERY_IDENTITY_UNAVAILABLE");

   // Supabase Auth updates the PASSWORD HASH for the currently authenticated
   // user. The password never enters our Edge Function, database tables, or URL.
   const {error:authError}=await client.auth.updateUser({password});
   if(authError)throw new Error("PUP_RECOVERY_PASSWORD_FAILED");
   passwordUpdated=true;

   // Link password login to the same pre-existing account, never a new save.
   const link=await client.functions.invoke("pup-web-auth",{
    body:{action:"credential-link",username}
   });
   if(link.error||link.data?.updated!==true)
    throw new Error("PUP_RECOVERY_LINK_FAILED");

   setComplete(true);
   setResult("Password login updated. You can now sign in with your Pup Account username.");
  }catch{
   setResult(passwordUpdated
    ?"Your password was updated, but the username-login link could not be confirmed. Your Discord access remains available; contact Support if username sign-in fails."
    :"Unable to update your password. Your existing account is unchanged. Please retry while signed in with your linked Discord account.");
  }finally{
   setPassword("");setConfirmation("");setBusy(false);
  }
 };
 return <div className="recovery-content">
  <div className="recovery-intro">
   <p className="eyebrow">🐾 PUP ACCOUNT SECURITY</p>
   <h1>Recover your Pup Account</h1>
   <p>Your identity has been verified. You can recover your username and create a new password without replacing your Android account or losing your cloud save.</p>
  </div>
  <div className="recovery-grid">
   <section className="portal-card recovery-main" aria-label="Recover account credentials">
    <div className="recovery-verified"><span aria-hidden="true">✓</span><div><strong>Verified account</strong><small>Connected to the same protected Pup Account identity</small></div></div>
    <h2>👤 Your Pup username</h2>
    <div className="recovery-username" aria-label="Recovered Pup Account username">{username}</div>
    <p>This is your current login username. You can use it to sign in on the website or Android app after configuring your password.</p>
    <div className="portal-divider"/>
    <h2>🔑 Reset your password</h2>
    <form className="profile-form" onSubmit={reset}>
     <label htmlFor="recoveryNewPassword">New password</label>
     <input id="recoveryNewPassword" type="password" required minLength={8} maxLength={128}
      value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password"/>
     <label htmlFor="recoveryConfirmPassword">Confirm new password</label>
     <input id="recoveryConfirmPassword" type="password" required minLength={8} maxLength={128}
      value={confirmation} onChange={e=>setConfirmation(e.target.value)} autoComplete="new-password"/>
     <p className="recovery-helper">Use a new, unique password with at least 8 characters. Do not share it with Support.</p>
     <button className="cta cta-primary stretch" disabled={busy} type="submit">{busy?"Updating password…":"Save new password"}</button>
    </form>
    {result?<p className={"portal-message"+(complete?" recovery-success":"")} role="status">{result}</p>:null}
    {complete?<a className="cta cta-secondary" href="/account">Return to your account</a>:null}
   </section>
   <aside className="portal-stack">
    <section className="portal-card"><h3>🛡️ What stays protected?</h3>
     <p>Recovering your login does not create another Pup Account or reset your saved puppies, inventory, Treats, XP, Friend Code, or Android ownership.</p>
     <p>Discord sign-in remains available as long as that connection is linked and your account is in good standing.</p>
    </section>
    <section className="portal-card"><h3>Wrong account?</h3>
     <p>Only reset credentials for your own signed-in Pup Account. Sign out and select the correct linked Discord account if the username above is unexpected.</p>
     <button className="small-action" type="button" onClick={()=>void signOut()}>Sign out and switch account</button>
    </section>
    <section className="portal-card"><h3>Lost Discord and password?</h3>
     <p>Use Puppy Clicker Android Settings → Support or another official Puppy Clicker support channel to request manual account recovery. Staff must verify ownership before making account changes.</p>
     <p>Contact emails are optional and unverified. We do not send automatic password reset links, and Support will never ask for your password.</p>
    </section>
   </aside>
  </div>
 </div>;
}
