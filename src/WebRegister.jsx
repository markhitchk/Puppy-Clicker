import React,{useState} from "react";
import {requestPuppyAuth,puppyAuthMessage} from "./native/web/puppyOAuth.js";
export default function WebRegister(){
 const [username,setUsername]=useState(""),[password,setPassword]=useState(""),[confirm,setConfirm]=useState("");
 const [terms,setTerms]=useState(false),[privacy,setPrivacy]=useState(false);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState("");
 async function register(e){
  e.preventDefault();
  if(busy)return;
  if(password!==confirm){setMessage("Passwords do not match.");return;}
  if(!terms||!privacy){setMessage("Accept the legal documents.");return;}
  setBusy(true);setMessage("");
  try{
   const result=await requestPuppyAuth("register",{username,password,termsAccepted:terms,privacyAccepted:privacy});
   if(!result.registered)throw Error("PUP_SIGNUP_UNAVAILABLE");
   setMessage("Account created! Sign in with your Pup Account username and password.");
   setPassword("");setConfirm("");
  }catch(e){setMessage(puppyAuthMessage(e));}
  finally{setBusy(false);}
 }
 return <div className="account-content"><div className="account-heading"><h1>🐾 Create a Pup Account</h1>
  <p>New website account. Already play on Android? Sign in with your existing Pup Account instead.</p></div>
  <section className="portal-card" style={{maxWidth:520,margin:"auto"}}>
   <form className="profile-form" onSubmit={register}>
    <label htmlFor="reg-name">Pup username</label>
    <input id="reg-name" autoComplete="username" required minLength={3} maxLength={20} pattern="[A-Za-z0-9_-]{3,20}" value={username} onChange={e=>setUsername(e.target.value)} disabled={busy}/>
    <label htmlFor="reg-pass">Password</label>
    <input id="reg-pass" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} disabled={busy}/>
    <label htmlFor="reg-confirm">Confirm password</label>
    <input id="reg-confirm" type="password" autoComplete="new-password" required minLength={8} value={confirm} onChange={e=>setConfirm(e.target.value)} disabled={busy}/>
    <label><input type="checkbox" required checked={terms} onChange={e=>setTerms(e.target.checked)} disabled={busy}/> I agree to the <a href="https://github.com/markhitchk/pup-clinker/blob/main/assets/legal/terms-of-use.md" target="_blank" rel="noopener noreferrer">Terms of Use</a>.</label>
    <label><input type="checkbox" required checked={privacy} onChange={e=>setPrivacy(e.target.checked)} disabled={busy}/> I acknowledge the <a href="https://github.com/markhitchk/pup-clinker/blob/main/assets/legal/privacy-policy.md" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.</label>
    <button type="submit" className="cta cta-primary stretch" disabled={busy}>{busy?"Creating account…":"Create Pup Account"}</button>
   </form>
   {message?<p role="status" className="portal-message">{message}</p>:null}
   <p><a href="/account">Already registered? Sign in</a></p>
  </section></div>;
}