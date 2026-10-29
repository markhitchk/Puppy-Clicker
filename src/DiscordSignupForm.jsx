import React,{useState} from "react";
import {requestPuppyAuth,verifyPuppySession,puppyAuthMessage,
 clearPendingDiscordSignup} from "./native/web/puppyOAuth.js";
import {client} from "./supabase.js";

const TERMS="https://github.com/markhitchk/pup-clinker/blob/main/assets/legal/terms-of-use.md";
const PRIVACY="/privacy";

export default function DiscordSignupForm({signup,onAuthenticated,onSignIn}){
 const {profile,ticket}=signup;
 const proposed=(profile.username||"").replace(/[^A-Za-z0-9_-]/g,"").slice(0,20);
 const [username,setUsername]=useState(proposed.length>=3?proposed:"");
 const [useDiscordEmail,setUseDiscordEmail]=useState(false);
 const [terms,setTerms]=useState(false);
 const [privacy,setPrivacy]=useState(false);
 const [busy,setBusy]=useState(false),[registered,setRegistered]=useState(false);
 const [message,setMessage]=useState("");
 const register=async event=>{
  event.preventDefault();
  if(busy||registered)return;
  if(!/^[A-Za-z0-9_-]{3,20}$/.test(username.trim())){
   setMessage("Choose a username with 3–20 letters, numbers, underscores or hyphens.");return;
  }
  if(!terms||!privacy){setMessage("Accept both the Terms and Privacy Policy.");return;}
  setBusy(true);setMessage("");
  try{
   const result=await requestPuppyAuth("discord-register",{
    ticket,username:username.trim(),termsAccepted:terms,privacyAccepted:privacy,
    useDiscordEmail
   });
   if(result.registered!==true)throw Error("PUP_SIGNUP_UNAVAILABLE");
   setRegistered(true);
   clearPendingDiscordSignup();
   if(result.token_hash&&result.otp_type==="magiclink"){
    const {error}=await client.auth.verifyOtp({token_hash:result.token_hash,type:"magiclink"});
    if(error)throw Error("PUP_WEB_SESSION_INVALID");
    const account=await verifyPuppySession(client);
    const {data}=await client.auth.getUser();
    if(!data?.user)throw Error("PUP_WEB_SESSION_INVALID");
    onAuthenticated?.(data.user,account);
    return;
   }
   setMessage("Pup Account created. Select Sign in with Discord to finish connecting.");
  }catch(e){
   setMessage(puppyAuthMessage(e));
  }finally{setBusy(false);}
 };
 const cancel=()=>{
  clearPendingDiscordSignup();
  onSignIn?.();
 };
 return <div className="discord-signup">
  <div className="discord-signup-profile">
   <div className="discord-signup-avatar">
    {profile.avatarUrl?<img src={profile.avatarUrl} alt="Discord avatar" referrerPolicy="no-referrer"/>:<span aria-hidden="true">🎮</span>}
   </div>
   <div className="discord-signup-identity">
    <span className="discord-signup-tag">Discord identity verified</span>
    <strong>{profile.displayName||profile.username}</strong>
    <small>@{profile.username}</small>
   </div>
  </div>
  <p>Complete your Pup Account registration. Your Discord identity will be securely linked to this new account. Existing accounts are never replaced.</p>
  <form className="profile-form" onSubmit={register}>
   <label htmlFor="discord-signup-username">Pup Account username</label>
   <input id="discord-signup-username" autoComplete="username" value={username}
    minLength={3} maxLength={20} pattern="[A-Za-z0-9_-]{3,20}" required
    onChange={e=>setUsername(e.target.value)} disabled={busy||registered}
    autoCapitalize="none" spellCheck="false"/>
   <p className="account-security-note">Discord sign-in does not require a password. You can add a Pup Account password later under Account Management.</p>
   <div className="discord-signup-email">
    <strong>Discord email</strong>
    {profile.email?<>
     <p>{profile.email} <span>· Discord-verified</span></p>
     <label className="account-auth-consent">
      <input type="checkbox" checked={useDiscordEmail} disabled={busy||registered}
       onChange={e=>setUseDiscordEmail(e.target.checked)}/>
      <span>Use this address as my optional support contact email.</span>
     </label>
    </>:<p>No verified email was returned by Discord. Email remains optional.</p>}
    <small>Discord email is not automatically used for Supabase password recovery.</small>
   </div>
   <label className="account-auth-consent">
    <input type="checkbox" required checked={terms} disabled={busy||registered}
     onChange={e=>setTerms(e.target.checked)}/>
    <span>I agree to the <a href={TERMS} target="_blank" rel="noopener noreferrer">Terms of Use</a>.</span>
   </label>
   <label className="account-auth-consent">
    <input type="checkbox" required checked={privacy} disabled={busy||registered}
     onChange={e=>setPrivacy(e.target.checked)}/>
    <span>I acknowledge the <a href={PRIVACY} target="_blank" rel="noopener noreferrer">Privacy Policy</a>, including processing my Discord account information.</span>
   </label>
   <button className="cta cta-primary stretch" type="submit"
    disabled={busy||registered||!client}>{busy?"Creating Pup Account…":registered?"Account created":"Create Pup Account with Discord"}</button>
  </form>
  {message?<p role="status" className="portal-message">{message}</p>:null}
  <button type="button" className="account-auth-text-button" disabled={busy} onClick={cancel}>Back to sign in</button>
 </div>;
}
