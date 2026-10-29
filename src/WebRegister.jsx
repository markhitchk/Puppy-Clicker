import React,{useState} from "react";
import {requestPuppyAuth,puppyAuthMessage,verifyPuppySession} from "./native/web/puppyOAuth.js";
import {client} from "./supabase.js";

// Reused inside the same Pup Account sign-in / registration panel on
// /account, /register (legacy link), and the signed-out /play gate.
export default function WebRegister({onAuthenticated,onSignIn}){
 const [username,setUsername]=useState("");
 const [password,setPassword]=useState("");
 const [confirm,setConfirm]=useState("");
 const [contactEmail,setContactEmail]=useState("");
 const [terms,setTerms]=useState(false);
 const [privacy,setPrivacy]=useState(false);
 const [busy,setBusy]=useState(false);
 const [registered,setRegistered]=useState(false);
 const [message,setMessage]=useState("");

 async function register(event){
  event.preventDefault();
  if(busy||registered)return;
  setMessage("");
  if(!client){setMessage("Pup Account registration is unavailable.");return;}
  const name=username.trim();
  if(!/^[A-Za-z0-9_-]{3,20}$/.test(name)){
   setMessage("Username must be 3–20 letters, numbers, underscores or hyphens.");return;
  }
  if(password.length<8||password.length>128){
   setMessage("Password must be between 8 and 128 characters.");return;
  }
  if(password!==confirm){setMessage("Passwords do not match.");return;}
  if(contactEmail.trim()&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())){
   setMessage("Enter a valid optional support email.");return;
  }
  if(!terms||!privacy){setMessage("Accept both the Terms of Use and Privacy Policy.");return;}
  setBusy(true);
  try{
   const result=await requestPuppyAuth("register",{
    username:name,password,contactEmail:contactEmail.trim()||null,
    termsAccepted:terms,privacyAccepted:privacy
   });
   if(!result.registered)throw Error("PUP_SIGNUP_UNAVAILABLE");
   setRegistered(true);
   setPassword("");setConfirm("");
   setMessage("Pup Account created. You can now sign in with this username and password.");
   if(result.access_token&&result.refresh_token){
    const {error:sessionError}=await client.auth.setSession({
     access_token:result.access_token,refresh_token:result.refresh_token
    });
    if(!sessionError){
     try{
      const account=await verifyPuppySession(client);
      const {data}=await client.auth.getUser();
      if(data?.user){
       if(onAuthenticated)onAuthenticated(data.user,account);
       else window.location.assign("/account");
      }
     }catch{
      // The account was created; a manual sign-in can retry verification.
     }
    }
   }
  }catch(error){
   setMessage(puppyAuthMessage(error));
  }finally{setBusy(false);}
 }
 return <div className="account-auth-register">
  <p className="account-auth-description">Create a new Pup Account to play on the web. Already play on Android? Use <strong>Sign In</strong> to keep your existing account and cloud progress.</p>
  <form className="profile-form" onSubmit={register} aria-label="Create Pup Account" autoComplete="on">
   <label htmlFor="reg-name">Pup username</label>
   <input id="reg-name" type="text" name="username" autoComplete="username" required minLength={3} maxLength={20}
    pattern="[A-Za-z0-9_-]{3,20}" value={username} onChange={e=>setUsername(e.target.value)}
    disabled={busy||registered} spellCheck="false" autoCapitalize="none"/>
   <label htmlFor="reg-pass">Password</label>
   <input id="reg-pass" type="password" name="new-password" autoComplete="new-password" required minLength={8}
    maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} disabled={busy||registered}/>
   <label htmlFor="reg-confirm">Confirm password</label>
   <input id="reg-confirm" type="password" name="confirm-password" autoComplete="new-password" required minLength={8}
    maxLength={128} value={confirm} onChange={e=>setConfirm(e.target.value)} disabled={busy||registered}/>
   <label htmlFor="reg-email">Support contact email (optional)</label>
   <input id="reg-email" type="email" name="email" autoComplete="email" maxLength={254}
    value={contactEmail} onChange={e=>setContactEmail(e.target.value)} disabled={busy||registered}/>
   <p className="account-security-note">This contact address is unverified and used for manual support only, not automatic password recovery.</p>
   <label className="account-auth-consent">
    <input type="checkbox" required checked={terms} onChange={e=>setTerms(e.target.checked)} disabled={busy||registered}/>
    <span>I agree to the <a href="https://github.com/markhitchk/pup-clinker/blob/main/assets/legal/terms-of-use.md" target="_blank" rel="noopener noreferrer">Terms of Use</a>.</span>
   </label>
   <label className="account-auth-consent">
    <input type="checkbox" required checked={privacy} onChange={e=>setPrivacy(e.target.checked)} disabled={busy||registered}/>
    <span>I acknowledge the <a href="https://github.com/markhitchk/pup-clinker/blob/main/assets/legal/privacy-policy.md" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.</span>
   </label>
   <button className="cta cta-primary stretch" type="submit" disabled={busy||registered||!client}>
    {busy?"Creating account…":registered?"Account created":"Create Pup Account"}
   </button>
  </form>
  {message?<p className="portal-message" role="status" aria-live="polite">{message}</p>:null}
  {registered&&onSignIn?<button type="button" className="account-auth-text-button" onClick={onSignIn}>Sign in with your new account</button>:null}
 </div>;
}
