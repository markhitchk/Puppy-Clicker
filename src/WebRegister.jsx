import React,{useState} from "react";
import {requestPuppyAuth,puppyAuthMessage,verifyPuppySession} from "./native/web/puppyOAuth.js";
import {client} from "./supabase.js";
export default function WebRegister(){
 const [username,setUsername]=useState(""),[password,setPassword]=useState(""),[confirm,setConfirm]=useState("");
 const [terms,setTerms]=useState(false),[privacy,setPrivacy]=useState(false);
 const [contactEmail,setContactEmail]=useState("");
 const [registered,setRegistered]=useState(false);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState("");
 async function register(e){
  e.preventDefault();
  if(busy||registered)return;
  if(!client){setMessage("Pup Account registration is unavailable.");return;}
  if(password!==confirm){setMessage("Passwords do not match.");return;}
  if(!terms||!privacy){setMessage("Accept the legal documents.");return;}
  if(contactEmail.trim()&&!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(contactEmail.trim())){setMessage("Enter a valid optional support email.");return;}
  setBusy(true);setMessage("");
  try{
   const result=await requestPuppyAuth("register",{username,password,contactEmail:contactEmail.trim()||null,termsAccepted:terms,privacyAccepted:privacy});
   if(!result.registered)throw Error("PUP_SIGNUP_UNAVAILABLE");
   setRegistered(true);
   setMessage("Account created! You can sign in with your Pup Account username and password.");
   setPassword("");setConfirm("");
   if(result.access_token&&result.refresh_token){
    const {error:sessionError}=await client.auth.setSession({
     access_token:result.access_token,refresh_token:result.refresh_token
    });
    if(!sessionError){
     try{
      await verifyPuppySession(client);
      window.location.assign("/play");
      return;
     }catch{}
    }
   }
  }catch(e){setMessage(puppyAuthMessage(e));}
  finally{setBusy(false);}
 }
 return <div className="account-content"><div className="account-heading"><h1>🐾 Create a Pup Account</h1>
  <p>New website account. Already play on Android? Sign in with your existing Pup Account instead.</p></div>
  <section className="portal-card" style={{maxWidth:520,margin:"auto"}}>
   <form className="profile-form" onSubmit={register}>
    <label htmlFor="reg-name">Pup username</label>
    <input id="reg-name" autoComplete="username" required minLength={3} maxLength={20} pattern="[A-Za-z0-9_-]{3,20}" value={username} onChange={e=>setUsername(e.target.value)} disabled={busy||registered}/>
    <label htmlFor="reg-pass">Password</label>
    <input id="reg-pass" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} disabled={busy}/>
    <label htmlFor="reg-confirm">Confirm password</label>
    <input id="reg-confirm" type="password" autoComplete="new-password" required minLength={8} value={confirm} onChange={e=>setConfirm(e.target.value)} disabled={busy}/>
    <label htmlFor="reg-email">Support contact email (optional)</label>
    <input id="reg-email" type="email" autoComplete="email" maxLength={254} value={contactEmail}
     onChange={e=>setContactEmail(e.target.value)} disabled={busy||registered}/>
    <p className="account-security-note">Optional, unverified contact for manual support only. It is not used for password login or automatic recovery.</p>
    <label><input type="checkbox" required checked={terms} onChange={e=>setTerms(e.target.checked)} disabled={busy}/> I agree to the <a href="https://github.com/markhitchk/pup-clinker/blob/main/assets/legal/terms-of-use.md" target="_blank" rel="noopener noreferrer">Terms of Use</a>.</label>
    <label><input type="checkbox" required checked={privacy} onChange={e=>setPrivacy(e.target.checked)} disabled={busy}/> I acknowledge the <a href="https://github.com/markhitchk/pup-clinker/blob/main/assets/legal/privacy-policy.md" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.</label>
    <button type="submit" className="cta cta-primary stretch" disabled={busy||registered||!client}>{busy?"Creating account…":registered?"Account created":"Create Pup Account"}</button>
   </form>
   {message?<p role="status" className="portal-message">{message}</p>:null}
   <p><a href="/account">Already registered? Sign in</a></p>
  </section></div>;
}