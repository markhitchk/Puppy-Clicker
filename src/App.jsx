import React,{useEffect,useState} from "react";
import NativeApp from "./native/App.jsx";
import RecoveryPage from "./RecoveryPage.jsx";
import WebAccountGate,{useWebAccount} from "./native/web/AccountGate.jsx";
import RecoveryPage from "./Recovery.jsx";
import ManualRecovery from "./ManualRecovery.jsx";
import {verifyPuppySession} from "./native/web/puppyOAuth.js";
import "./styles.css";

const logo="/assets/logos/puppy_clicker.png";
function Header({page}){
 return <header className="site-header">
  <a className="site-brand" href="/" aria-label="Puppy Clicker home">
   <img src={logo} alt="" /><span><strong>Puppy Clicker</strong><small>Harley's Studios</small></span>
  </a>
  <nav className="site-nav" aria-label="Website">
   <a href="/" aria-current={page==="home"?"page":undefined}>Home</a>
   <a href="/play" aria-current={page==="play"?"page":undefined}>🐾 Play</a>
   <a href="/account" aria-current={page==="account"?"page":undefined}>Account</a>
  </nav>
 </header>;
}
function Home(){
 return <div className="landing">
  <section className="hero">
   <div className="hero-copy">
    <p className="eyebrow">🐾 PUPPY CLICKER · WEB EDITION</p>
    <h1>Tap. Care. Collect.<br/><span>Grow your puppy world.</span></h1>
    <p className="hero-lede">Meet adorable puppies, earn Treats by tapping, grow your collection, take care of your companions, and unlock new rewards. Play in your browser with your Pup Account.</p>
    <div className="hero-actions"><a className="cta cta-primary" href="/play">🐶 Play Puppy Clicker</a><a className="cta cta-secondary" href="/account">Manage Pup Account</a></div>
    <p className="hero-note">Already play on Android? Use your existing Pup Account to access your linked cloud progression. Gameplay access depends on your account's verified save.</p>
   </div>
   <div className="hero-art">
    <div className="art-glow"></div>
    <div className="hero-pup"><img src="/assets/transparent/v1/v1_classic.png" alt="Classic Puppy Clicker puppy" /></div>
    <span className="art-tag tag-left">🍪 Earn Treats</span>
    <span className="art-tag tag-right">💖 Care for pups</span>
    <span className="hero-art-caption">One puppy world. Your progress.</span>
   </div>
  </section>
  <section className="home-section">
   <div className="section-intro"><p className="eyebrow">THE ADVENTURE</p><h2>More than a clicker game</h2><p>Discover every part of the Puppy Clicker experience.</p></div>
   <div className="feature-grid">
    <article className="feature-card"><div className="feature-icon">🍪</div><h3>Tap &amp; upgrade</h3><p>Earn Treats, improve your tapping power and build your puppy's economy.</p></article>
    <article className="feature-card"><div className="feature-icon">🐶</div><h3>Collect puppies</h3><p>Explore the roster, unlock companions and choose your active puppy.</p></article>
    <article className="feature-card"><div className="feature-icon">💖</div><h3>Pup Care</h3><p>Feed, play, rest and bond with your puppy to keep them happy.</p></article>
    <article className="feature-card"><div className="feature-icon">🎁</div><h3>Rewards &amp; minigames</h3><p>Complete goals, collect rewards and explore puppy-themed games.</p></article>
   </div>
  </section>
  <section className="home-section split-cta">
   <div><p className="eyebrow">YOUR GAME · YOUR ACCOUNT</p><h2>Manage your Pup Account</h2><p>Sign in with a Pup username or the Puppy Clicker Discord login, check your account, and update your display name without opening the game.</p><a href="/account" className="cta cta-secondary">Open Account Management</a><a href="/recovery" className="recovery-home-link">Forgot your login? Recover your Pup Account</a></div>
   <div className="account-preview"><span>🐾</span><strong>Pup Account</strong><p>Verified login · Linked progress · Account settings</p></div>
  </section>
  <footer className="site-footer"><span>© {new Date().getFullYear()} Harley's Studios · Puppy Clicker</span><span><a href="/recovery">Recover Pup Account</a> · Made for puppy fans 🐶</span></footer>
 </div>;
}
const accountRole=role=>({DEVELOPER:"Developer",ADMIN:"Administrator",PUP_MEMBER:"Pup Member"})[role]||"Player";
function AccountDashboard(){
 const {client,pupAccount,signOut}=useWebAccount();
 const [profile,setProfile]=useState(pupAccount);
 const [displayName,setDisplayName]=useState(pupAccount.displayName||pupAccount.username||"");
 const [editing,setEditing]=useState(false);
 const [saving,setSaving]=useState(false);
 const [status,setStatus]=useState("");
 const [cloud,setCloud]=useState({loading:true,exists:null,updatedAt:null});
 const [refreshing,setRefreshing]=useState(false);
 const [credentialUsername,setCredentialUsername]=useState(pupAccount.username||"");
 const [credentialPassword,setCredentialPassword]=useState("");
 const [credentialConfirmation,setCredentialConfirmation]=useState("");
 const [credentialBusy,setCredentialBusy]=useState(false);
 const [credentialMessage,setCredentialMessage]=useState("");
 const refresh=async()=>{
  setRefreshing(true);setStatus("");
  try{
   const account=await verifyPuppySession(client);
   setProfile(account);
   if(!editing)setDisplayName(account.displayName||account.username||"");
   if(!credentialBusy)setCredentialUsername(account.username||"");
  }catch{
   setStatus("Could not refresh your account details. Please sign in again if the problem continues.");
   setRefreshing(false);
   return;
  }
  try{
   const {data,error}=await client.functions.invoke("pup-web-auth",{body:{action:"cloud-save-read"}});
   if(error||!data?.verified)throw Error("CLOUD_CHECK_FAILED");
   setCloud({loading:false,exists:data.cloud?.exists===true,
    updatedAt:data.cloud?.updatedAt||null});
  }catch{
   // Account identity remains verified even if the cloud endpoint is temporarily unavailable.
   setCloud({loading:false,exists:null,updatedAt:null});
  }finally{setRefreshing(false);}
 };
 useEffect(()=>{void refresh();},[]);
 const save=async event=>{
  event.preventDefault();
  if(saving)return;
  const name=displayName.trim();
  if(name.length<2||name.length>24||!/^[\p{L}\p{N} ._'’-]+$/u.test(name)){
   setStatus("Display name must be 2–24 characters, using letters, numbers, spaces or . _ ' -.");
   return;
  }
  setSaving(true);setStatus("");
  try{
   const {data,error}=await client.functions.invoke("pup-web-auth",{body:{action:"account-update",displayName:name}});
   if(error||!data?.updated)throw Error("ACCOUNT_UPDATE_FAILED");
   setProfile(old=>({...old,displayName:data.displayName||name}));
   setDisplayName(data.displayName||name);setEditing(false);
   setStatus("Display name saved to your Pup Account.");
  }catch{setStatus("Unable to save your display name. Please try again.");}
  finally{setSaving(false);}
 };

 const saveCredentials=async event=>{
  event.preventDefault();
  if(credentialBusy)return;
  const username=credentialUsername.trim();
  const password=credentialPassword;
  if(!/^[A-Za-z0-9_-]{3,20}$/.test(username)){
   setCredentialMessage("Username must be 3–20 letters, numbers, underscores or hyphens.");return;
  }
  if(password.length<8||password.length>128){
   setCredentialMessage("Password must be between 8 and 128 characters.");return;
  }
  if(password!==credentialConfirmation){
   setCredentialMessage("Passwords do not match.");return;
  }
  setCredentialBusy(true);setCredentialMessage("");
  try{
   // Confirm the session owns this account and the username is available
   // before Supabase Auth changes the signed-in user's own password.
   const check=await client.functions.invoke("pup-web-auth",{
    body:{action:"credential-check",username}
   });
   if(check.error||check.data?.available!==true)
    throw Error(check.data?.error||"CREDENTIAL_CHECK_FAILED");
   const updated=await client.auth.updateUser({password});
   if(updated.error)throw Error("PASSWORD_UPDATE_FAILED");
   const linked=await client.functions.invoke("pup-web-auth",{
    body:{action:"credential-link",username}
   });
   if(linked.error||linked.data?.updated!==true)
    throw Error(linked.data?.error||"CREDENTIAL_LINK_FAILED");
   setProfile(old=>({...old,username,passwordLoginEnabled:true}));
   setCredentialMessage("Username and password login are now enabled for this Pup Account.");
   setStatus("");
  }catch{
   setCredentialMessage("Could not complete password login setup. Your existing account remains accessible through Discord. Verify your connection and retry.");
  }finally{
   setCredentialPassword("");setCredentialConfirmation("");setCredentialBusy(false);
  }
 };
 const shareFriendCode=async()=>{
  const code=profile.friendCode;
  if(!code)return;
  try{
   if(navigator.share){await navigator.share({text:code});return;}
   if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(code);
    setStatus("Friend Code copied.");return;}
   setStatus("Select and copy the Friend Code shown above.");
  }catch(e){if(e?.name!=="AbortError")setStatus("Could not share. Select and copy the Friend Code shown above.");}
 };
 const detail=(label,value,description)=> <div className="account-detail" key={label}>
  <dt>{label}</dt><dd>{value||"Not available"}</dd>{description?<small>{description}</small>:null}
 </div>;
 const connected=profile.discordUserId?"Connected":"Not connected";
 const standing=profile.status==="VERIFIED"||!profile.status?"Verified":profile.status;
 const connection=profile.linkedFromPlay===true?"Linked to Android Pup Account":
  profile.linkedFromPlay===false?"Pup Account · Android connection unavailable":"Checking Android connection…";
 const gameplay=profile.gameplayWritable===true?"Enabled":
  profile.gameplayWritable===false?"Unavailable":"Checking…";
 const cloudLabel=cloud.loading?"Checking protected cloud save…":
  cloud.exists===true?"Cloud backup found":cloud.exists===false?"No cloud backup found":"Cloud status unavailable";
 return <div className="account-content">
  <div className="account-heading"><p className="eyebrow">🐾 PUP ACCOUNT</p><h1>Your account</h1><p>View your verified Puppy Clicker identity and Android-linked account details. Only your signed-in account is shown.</p></div>
  <div className="account-grid">
   <section className="portal-card profile-main" aria-label="Pup Account details">
    <div className="profile-head"><img src={logo} alt="" /><div><small>Signed in as</small><h2>{profile.displayName||profile.username}</h2><p>@{profile.username}</p></div><span className="verified">✓ {standing}</span></div>
    <div className="portal-divider"></div>
    <h3>👤 Account details</h3>
    <dl className="account-details">
     {detail("Account username","@"+profile.username)}
     {detail("Display name",profile.displayName||profile.username)}
     {detail("Friend Code",profile.friendCode,"Share this code to connect with players in Puppy Exchange.")}
     {detail("Account standing",standing)}
     {detail("Role",profile.guildRole===undefined?"Checking…":accountRole(profile.guildRole))}
     {detail("Account connection",connection)}
     {detail("Gameplay access",gameplay)}
     {detail("Discord",connected)}
     {profile.contactEmail?detail("Support contact email",profile.contactEmail,"Visible only to your signed-in account."):null}
    </dl>
    {profile.friendCode?<div className="account-actions"><button type="button" className="cta cta-primary" onClick={()=>void shareFriendCode()}>🔗 Share Friend Code</button></div>:null}
    <div className="portal-divider"></div>
    <h3>✏️ Profile settings</h3>
    {editing?<form onSubmit={save} className="profile-form"><label htmlFor="pupDisplayName">Display name</label><input id="pupDisplayName" value={displayName} maxLength={24} onChange={e=>setDisplayName(e.target.value)} autoComplete="nickname"/><div className="form-actions"><button className="cta cta-primary" disabled={saving} type="submit">{saving?"Saving…":"Save display name"}</button><button className="cta cta-secondary" type="button" onClick={()=>{setEditing(false);setDisplayName(profile.displayName||profile.username);}}>Cancel</button></div></form>:
     <div className="profile-row"><span><small>Display name</small><strong>{profile.displayName||profile.username}</strong></span><button className="small-action" type="button" onClick={()=>setEditing(true)}>Edit name</button></div>}
    {status?<p className="portal-message" role="status">{status}</p>:null}
   </section>
   <div className="portal-stack">
    <section className="portal-card"><h3>☁️ Cloud game progress</h3><p>Your website and Android game use the same protected Pup Account save when linked. No backend credentials or private save identifiers are displayed.</p><p className="cloud-status" role="status">{cloudLabel}</p>
     {cloud.updatedAt?<p className="cloud-updated">Last cloud update: {new Date(cloud.updatedAt).toLocaleString()}</p>:null}
     <a href="/play" className="cta cta-primary stretch">🐾 Continue playing</a>
    </section>

    <section className="portal-card">
     <h3>🔐 Username &amp; password login</h3>
     <p>{profile.passwordLoginEnabled===true?"Password login is enabled for your Pup Account. You can change your password here.":"Add a username and password to the Pup Account you're already signed into with Discord. Your cloud progress, Friend Code, and game ownership are preserved."}</p>
     <form className="profile-form account-credentials" onSubmit={saveCredentials} autoComplete="off">
      <label htmlFor="pupCredentialUsername">Pup Account username</label>
      <input id="pupCredentialUsername" type="text" minLength={3} maxLength={20}
       spellCheck="false" autoCapitalize="none" autoCorrect="off" required
       value={credentialUsername} onChange={e=>setCredentialUsername(e.target.value)}
       autoComplete="off"/>
      <label htmlFor="pupCredentialPassword">{profile.passwordLoginEnabled?"New password":"Password"}</label>
      <input id="pupCredentialPassword" type="password" minLength={8} maxLength={128}
       required value={credentialPassword} onChange={e=>setCredentialPassword(e.target.value)}
       autoComplete="new-password"/>
      <label htmlFor="pupCredentialConfirm">Confirm password</label>
      <input id="pupCredentialConfirm" type="password" minLength={8} maxLength={128}
       required value={credentialConfirmation} onChange={e=>setCredentialConfirmation(e.target.value)}
       autoComplete="new-password"/>
      <button className="cta cta-primary stretch" type="submit" disabled={credentialBusy}>
       {credentialBusy?"Securing account…":profile.passwordLoginEnabled?"Update password login":"Enable password login"}
      </button>
     </form>
     {credentialMessage?<p className="portal-message" role="status">{credentialMessage}</p>:null}
     <p className="account-security-note">Use a unique password. Sign-in details are sent to Supabase Auth over HTTPS and are not stored in the website's source code or local preferences.</p>
    </section>
    <section className="portal-card"><h3>Account management</h3><p>Refresh your verified account connection, reset a forgotten password, or request account recovery.</p><a href="/recovery" className="cta cta-secondary stretch">🔐 Account recovery</a><a href="/recovery" className="cta cta-primary stretch">🔑 Recover username or reset password</a><button type="button" className="small-action" onClick={()=>void refresh()} disabled={refreshing}>{refreshing?"Refreshing…":"Refresh account details"}</button><button className="cta cta-secondary stretch" type="button" onClick={()=>void signOut()}>Sign out</button></section>
   </div>
  </div>
 </div>;
}
function AccountPortal(){return <WebAccountGate><AccountDashboard/></WebAccountGate>;}
function DiscordCallbackPage(){
 // Process the browser PKCE callback using the verified website account gate;
 // only exact preapproved return paths are restored after authentication.
 return <WebAccountGate><div className="account-content"><p role="status">Completing secure Pup Account sign-in…</p></div></WebAccountGate>;
}
export default function App(){
 const path=typeof window!=="undefined"?window.location.pathname:"/";
 const callback=path==="/auth/discord/callback";
 const page=path==="/account"?"account":path==="/recovery"?"recovery":
  callback?"callback":path==="/play"?"play":"home";
 return <div className={"site-frame "+(page==="play"?"site-frame-game":"site-frame-page")}>
  <Header page={callback?"account":page}/>
  <main className={page==="play"?"game-mount":"page-mount"}>
   {page==="home"?<Home/>:page==="account"?<AccountPortal/>:
    page==="recovery"?<RecoveryPage/>:
    page==="callback"?<DiscordCallbackPage/>:<NativeApp/>}
  </main>
 </div>;
}
