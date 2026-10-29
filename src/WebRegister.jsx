import React,{useState} from "react";
import {requestPuppyAuth,puppyAuthMessage,verifyPuppySession,
 beginPuppyDiscord,getPendingDiscordSignup} from "./native/web/puppyOAuth.js";
import DiscordSignupForm from "./DiscordSignupForm.jsx";
import {DISCORD_ICON_URL} from "./discordIcon.js";
import {client} from "./supabase.js";

// Mirror the Supabase Auth password policy before submitting a new account.
const PASSWORD_SYMBOLS=new Set(["!","@","#","$","%","^","&","*","(",")","_","+","-","=","[","]","{","}",";","'","\\",":","\"","|","<",">","?",",",".","/","`","~"]);
const passwordRules=value=>[
 {label:"8–128 characters",passed:value.length>=8&&value.length<=128},
 {label:"Uppercase letter",passed:/[A-Z]/.test(value)},
 {label:"Lowercase letter",passed:/[a-z]/.test(value)},
 {label:"Number",passed:/[0-9]/.test(value)},
 {label:"Special character",passed:[...value].some(character=>PASSWORD_SYMBOLS.has(character))}
];

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
 const [discordSignup]=useState(()=>getPendingDiscordSignup());
 const [discordBusy,setDiscordBusy]=useState(false);
 const registerWithDiscord=async()=>{
  if(discordBusy)return;
  setDiscordBusy(true);setMessage("");
  try{window.location.assign(await beginPuppyDiscord());}
  catch(error){setMessage(puppyAuthMessage(error));setDiscordBusy(false);}
 };

 async function register(event){
  event.preventDefault();
  if(busy||registered)return;
  setMessage("");
  if(!client){setMessage("Pup Account registration is unavailable.");return;}
  const name=username.trim();
  if(!/^[A-Za-z0-9_-]{3,20}$/.test(name)){
   setMessage("Username must be 3–20 letters, numbers, underscores or hyphens.");return;
  }
  if(passwordRules(password).some(rule=>!rule.passed)){
   setMessage("Password must be 8–128 characters and include uppercase and lowercase letters, a number, and a special character.");return;
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
 return <div className="account-auth-register android-auth-register">
  <div className="android-auth-title"><span className="android-auth-step">PUP ACCOUNT · SET UP YOUR ACCOUNT</span><h2>Create Pup Account</h2><p>Choose a username and password, or continue with Discord. Both legal policies require acceptance.</p></div>
  <section className="android-auth-provider">
   <div className="android-auth-provider-heading"><img src={DISCORD_ICON_URL} alt="" onError={event=>{event.currentTarget.onerror=null;event.currentTarget.src="/assets/logos/discord.png";}} /><div><strong>Discord</strong><small>Alternative account registration or sign-in</small></div></div>
   <p>Register using your Discord identity and optionally import your verified Discord email as a support contact.</p>
   {!discordSignup?<button type="button" className="cta cta-secondary stretch" onClick={()=>void registerWithDiscord()} disabled={discordBusy}><img className="pup-discord-button-icon" src={DISCORD_ICON_URL} alt="" onError={event=>{event.currentTarget.onerror=null;event.currentTarget.src="/assets/logos/discord.png";}} />{discordBusy?"Connecting to Discord…":"Register with Discord"}</button>:null}
  </section>
  {discordSignup?<DiscordSignupForm signup={discordSignup} onAuthenticated={onAuthenticated} onSignIn={onSignIn}/>:
  <section className="android-auth-provider">
   <div className="android-auth-provider-heading"><img src="/assets/logos/puppy_clicker.png" alt="" /><div><strong>Pup Account</strong><small>Username and password registration</small></div></div>
  <p className="account-auth-description">Create a new Pup Account to play on the web. Already play on Android? Use <strong>Sign In</strong> to keep your existing account and cloud progress.</p>
  <form className="profile-form" onSubmit={register} aria-label="Create Pup Account" autoComplete="on">
   <label htmlFor="reg-name">Pup username</label>
   <input id="reg-name" type="text" name="username" autoComplete="username" required minLength={3} maxLength={20}
    pattern="[A-Za-z0-9_-]{3,20}" value={username} onChange={e=>setUsername(e.target.value)}
    disabled={busy||registered} spellCheck="false" autoCapitalize="none"/>
   <label htmlFor="reg-pass">Password</label>
   <input id="reg-pass" type="password" name="new-password" autoComplete="new-password" required minLength={8}
    maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} disabled={busy||registered}/>
   <div className="account-password-rules" aria-label="Password requirements">
    {passwordRules(password).map(rule=><span key={rule.label}
     className={"account-password-rule"+(rule.passed?" satisfied":"")}>
     {rule.passed?"✓":"○"} {rule.label}
    </span>)}
   </div>
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
    <span>I acknowledge the <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>, including website connection and account security records.</span>
   </label>
   <button className="cta cta-primary stretch" type="submit" disabled={busy||registered||!client}>
    {busy?"Creating account…":registered?"Account created":"Create Pup Account"}
   </button>
  </form></section>}
  {message?<p className="portal-message" role="status" aria-live="polite">{message}</p>:null}
  {registered&&onSignIn?<button type="button" className="account-auth-text-button" onClick={onSignIn}>Sign in with your new account</button>:null}
 </div>;
}
