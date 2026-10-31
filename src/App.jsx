import {installInspectionDeterrent} from "./inspectionDeterrent.js";
import React,{useEffect,useId,useRef,useState} from "react";
import NativeApp from "./native/App.jsx";
import RecoveryPage from "./RecoveryPage.jsx";
import MeetPuppies from "./MeetPuppies.jsx";
import WebLoading from "./WebLoading.jsx";
import WebErrorPage from "./WebErrorPage.jsx";
import WebAccountGate,{useWebAccount} from "./native/web/AccountGate.jsx";
import {loadWebPreferences,WEB_PREFERENCES_CHANGED} from "./native/web/preferences.js";
import {beginPuppyDiscord,verifyPuppySession,puppyAuthMessage} from "./native/web/puppyOAuth.js";
import {DISCORD_ICON_URL} from "./discordIcon.js";
import AndroidAppBanner from "./AndroidAppBanner.jsx";
import HomePlayDemo from "./HomePlayDemo.jsx";
import {useDemoAccess} from "./useDemoAccess.js";
import {isPlayDemoRoute} from "./playDemoRoute.js";
import NetworkCheckReporter from "./NetworkCheckReporter.jsx";
import AdminPortal from "./AdminPortal.jsx";
import WebPrivacy from "./WebPrivacy.jsx";
import LegalReader from "./LegalReader.jsx";
import Leaderboard from "./Leaderboard.jsx";
import CommunityChat from "./CommunityChat.jsx";
import AdminChat from "./AdminChat.jsx";
import LanguagePicker,{useLanguage} from "./LanguagePicker.jsx";
import ProfileAvatarEditor from "./ProfileAvatarEditor.jsx";
import PupGiftRequests from "./PupGiftRequests.jsx";
import {avatarForAccount} from "./pupWebApi.js";
import SiteAccountMenu,{ProfileAvatar,PUP_ACCOUNT_CHANGED} from "./SiteAccountMenu.jsx";
import "./styles.css";

const logo="/assets/logos/puppy_clicker.png";
function Header({page}){
 const {t:tr}=useLanguage();
 const [menuOpen,setMenuOpen]=useState(false);
 const navId=useId(),navRef=useRef(null),menuButton=useRef(null);
 useEffect(()=>{
  if(!menuOpen)return;
  const keyDown=event=>{
   if(event.key==="Escape"){
    setMenuOpen(false);
    menuButton.current?.focus();
   }
  };
  const pointerDown=event=>{
   if(!navRef.current?.contains(event.target)&&!menuButton.current?.contains(event.target)){
    setMenuOpen(false);
   }
  };
  const resized=()=>{if(window.innerWidth>=1280)setMenuOpen(false);};
  document.addEventListener("keydown",keyDown);
  document.addEventListener("pointerdown",pointerDown);
  window.addEventListener("resize",resized);
  return()=>{
   document.removeEventListener("keydown",keyDown);
   document.removeEventListener("pointerdown",pointerDown);
   window.removeEventListener("resize",resized);
  };
 },[menuOpen]);
 return <header className="site-header">
  <a className="site-brand" href="/" aria-label="Puppy Clicker home">
   <img src={logo} alt="" /><span><strong>Puppy Clicker</strong><small>Harley's Studios</small></span>
  </a>
  <nav ref={navRef} id={navId} className={"site-nav"+(menuOpen?" is-open":"")} aria-label="Website"
   onClick={event=>{if(event.target.closest("a[href]"))setMenuOpen(false);}}>
   <a href="/" aria-current={page==="home"?"page":undefined}>{tr("home")}</a>
   <a href="/play" aria-current={page==="play"?"page":undefined}>🐾 {tr("play")}</a>
   <a href="/puppies" aria-current={page==="puppies"?"page":undefined}>{tr("puppies")}</a>
   <a href="/legal/privacy" aria-current={page==="legal"?"page":undefined}>{tr("policies")}</a>
   <a href="/leaderboard" aria-current={page==="leaderboard"?"page":undefined}>🏆 {tr("leaderboard")}</a>
   <a href="/chat" aria-current={page==="chat"?"page":undefined}>💬 {tr("chat")}</a>
   <LanguagePicker compact/>
  </nav>
  <div className="site-header-tools">
   <button ref={menuButton} type="button" className="site-nav-toggle"
    aria-controls={navId} aria-expanded={menuOpen}
    aria-label={menuOpen?tr("closeMenu"):tr("openMenu")}
    onClick={()=>setMenuOpen(open=>!open)}>
    <span className="site-nav-toggle-icon" aria-hidden="true">{menuOpen?"✕":"☰"}</span>
    <span className="site-nav-toggle-text">{tr("menu")}</span>
   </button>
   <SiteAccountMenu active={page==="account"}/>
  </div>
 </header>;
}
function TryDemoLink(){
 const {t:tr}=useLanguage();
 const access=useDemoAccess();
 return access==="guest"?<a className="cta cta-secondary" href="/play?=demo">🎮 {tr("heroDemo")}</a>:null;
}
function DemoPage(){
 const access=useDemoAccess();
 useEffect(()=>{if(access==="member")window.location.replace("/play");},[access]);
 if(access!=="guest")return <WebLoading stage="account" detail="Checking your account before opening the game."/>;
 return <div className="landing"><HomePlayDemo standalone/></div>;
}
function Home(){
 const {t:tr}=useLanguage();
 return <div className="landing">
  <section className="hero">
   <div className="hero-copy">
    <p className="eyebrow">🐾 {tr("heroLabel")}</p>
    <h1>{tr("heroLine1")}<br/><span>{tr("heroLine2")}</span></h1>
    <p className="hero-lede">{tr("heroIntro")}</p>
    <div className="hero-actions"><a className="cta cta-primary" href="/play">🐶 {tr("heroPlay")}</a><TryDemoLink/><a className="cta cta-secondary" href="/account">Manage Pup Account</a></div>
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
  <MeetPuppies preview/>
  <section className="home-section split-cta">
   <div className="home-account-copy">
    <p className="eyebrow">YOUR GAME · YOUR ACCOUNT</p>
    <h2>Manage your Pup Account</h2>
    <p>Sign in with a Pup username or the Puppy Clicker Discord login, check your account, and update your display name without opening the game.</p>
    <div className="home-account-actions">
     <a href="/account" className="cta cta-secondary">Open Account Management</a>
     <a href="/account?mode=register" className="cta cta-primary">Create Pup Account</a>
    </div>
    <a href="/recovery" className="home-account-recovery">Forgot your login? Recover your Pup Account</a>
   </div>
   <div className="account-preview"><span>🐾</span><strong>Pup Account</strong><p>Verified login · Linked progress · Account settings</p></div>
  </section>
  <footer className="site-footer"><span>© {new Date().getFullYear()} Harley's Studios · Puppy Clicker</span><span><a href="/recovery">Recover Pup Account</a> · <a href="/privacy">Website privacy</a> · <a href="/legal/privacy">Policies</a> · Made for puppy fans 🐶</span></footer>
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
 const [discordLinkBusy,setDiscordLinkBusy]=useState(false);
 const [discordLinkMessage,setDiscordLinkMessage]=useState("");
 useEffect(()=>{
  const url=new URL(globalThis.location.href);
  if(url.searchParams.get("discord")!=="linked")return;
  setDiscordLinkMessage("Discord connected to your existing Pup Account. Your game progress and Friend Code are unchanged.");
  url.searchParams.delete("discord");
  globalThis.history.replaceState(globalThis.history.state,"",url.pathname+url.search+url.hash);
 },[]);
 useEffect(()=>{
  const id=window.location.hash.slice(1);
  if(!["profile-settings","account-security","account-management"].includes(id))return;
  const frame=requestAnimationFrame(()=>document.getElementById(id)?.scrollIntoView({block:"start"}));
  return ()=>cancelAnimationFrame(frame);
 },[]);
 const refresh=async()=>{
  setRefreshing(true);setStatus("");
  try{
   const account=await verifyPuppySession(client);
   setProfile(await avatarForAccount(account));
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
    window.dispatchEvent(new Event(PUP_ACCOUNT_CHANGED));
  }catch{setStatus("Unable to save your display name. Please try again.");}
  finally{setSaving(false);}
 };

 const linkDiscord=async()=>{
  if(discordLinkBusy||profile.discordUserId)return;
  setDiscordLinkBusy(true);setDiscordLinkMessage("");
  try{
   // Linking is authorized for the signed-in account, never a browser-supplied player ID.
   const {data,error}=await client.auth.getUser();
   if(error||!data?.user)throw Error("PUP_ACCOUNT_SESSION_REQUIRED");
   const checked=await verifyPuppySession(client);
   if(checked.id!==pupAccount.id)throw Error("PUP_ACCOUNT_SESSION_REQUIRED");
   if(checked.discordUserId)throw Error("PUP_ACCOUNT_DISCORD_ALREADY_LINKED");
   const url=await beginPuppyDiscord({mode:"link",authUserId:data.user.id});
   window.location.assign(url);
  }catch(error){
   setDiscordLinkMessage(puppyAuthMessage(error));
   setDiscordLinkBusy(false);
  }
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
    window.dispatchEvent(new Event(PUP_ACCOUNT_CHANGED));
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
 const connection=profile.webOnly===true?"Website Pup Account (not linked to Android)":
   profile.linkedFromPlay===true?"Linked to Android Pup Account":
  profile.linkedFromPlay===false?"Pup Account · Android connection unavailable":"Checking Android connection…";
 const gameplay=profile.gameplayWritable===true?"Enabled":
  profile.gameplayWritable===false?"Unavailable":"Checking…";
 const cloudLabel=cloud.loading?"Checking protected cloud save…":
  cloud.exists===true?"Cloud backup found":cloud.exists===false?"No cloud backup found":"Cloud status unavailable";
 return <div className="account-content">
  <div className="account-heading"><p className="eyebrow">🐾 PUP ACCOUNT</p><h1>Your account</h1><p>View your verified Puppy Clicker identity, profile picture and Android-linked account details. Only your signed-in account is shown.</p></div>
  <div className="account-grid">
   <section className="portal-card profile-main" aria-label="Pup Account details">
    <div className="profile-head"><ProfileAvatar account={profile} className="profile-avatar-large"/><div><small>Signed in as</small><h2>{profile.displayName||profile.username}</h2><p>@{profile.username}</p></div><span className="verified">✓ {standing}</span></div>
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
     {detail("PupEye Web",profile.pupeyeWeb?.mode==="server-verified"?"Server protection active":"Checking protection…",
       "Browser gameplay and privileged actions use server-side account verification and abuse limits. Browser identification is not Android device attestation.")}
     {detail("Discord",connected)}
     {profile.discordProfile?<>
      {detail("Discord username",profile.discordProfile.username?"@"+profile.discordProfile.username:null)}
      {detail("Discord display name",profile.discordProfile.displayName)}
      {detail("Discord user ID",profile.discordProfile.id)}
      {profile.discordProfile.email?detail("Discord email",profile.discordProfile.email,
       "Returned through Discord OAuth. Not automatically a verified Supabase recovery email."):null}
     </>:null}
     {profile.recoveryEmail?detail("Verified recovery email",profile.recoveryEmail,"Confirmed by Supabase Auth. Used for password-reset links."):detail("Verified recovery email","Not configured","Visit /recovery to link and verify an email address.")}
     {profile.contactEmail?detail("Support contact email",profile.contactEmail,"Visible only to your signed-in account."):null}
    </dl>
     <p className="pup-admin-note">For account security, the website records recent signed-in visits, IP address (when available), browser information and page path for authorized staff review. These are website sessions, not Android installations.</p>
    {["ADMIN","DEVELOPER"].includes(profile.guildRole)?<div className="account-actions"><a className="cta cta-secondary" href="/account/admin">🛡️ Open Admin Panel</a></div>:null}
    {profile.friendCode?<div className="account-actions"><button type="button" className="cta cta-primary" onClick={()=>void shareFriendCode()}>🔗 Share Friend Code</button></div>:null}
    <div className="portal-divider"></div>
    <h3 id="profile-settings">✏️ Profile settings</h3>
     <ProfileAvatarEditor account={profile} onChanged={avatarUrl=>setProfile(old=>({...old,avatarUrl}))}/>
    {editing?<form onSubmit={save} className="profile-form"><label htmlFor="pupDisplayName">Display name</label><input id="pupDisplayName" value={displayName} maxLength={24} onChange={e=>setDisplayName(e.target.value)} autoComplete="nickname"/><div className="form-actions"><button className="cta cta-primary" disabled={saving} type="submit">{saving?"Saving…":"Save display name"}</button><button className="cta cta-secondary" type="button" onClick={()=>{setEditing(false);setDisplayName(profile.displayName||profile.username);}}>Cancel</button></div></form>:
     <div className="profile-row"><span><small>Display name</small><strong>{profile.displayName||profile.username}</strong></span><button className="small-action" type="button" onClick={()=>setEditing(true)}>Edit name</button></div>}
    {status?<p className="portal-message" role="status">{status}</p>:null}
   </section>
   <div className="portal-stack">
    <section className="portal-card"><h3>☁️ Cloud game progress</h3><p>Your website and Android game use the same protected Pup Account save when linked. No backend credentials or private save identifiers are displayed.</p><p className="cloud-status" role="status">{cloudLabel}</p>
     {cloud.updatedAt?<p className="cloud-updated">Last cloud update: {new Date(cloud.updatedAt).toLocaleString()}</p>:null}
     <a href="/play" className="cta cta-primary stretch">🐾 Continue playing</a>
    </section>

    <section className="portal-card" aria-labelledby="discord-account-heading">
     <h3 id="discord-account-heading">🔗 Discord account</h3>
     {profile.discordUserId?<>
      <p><strong>Connected</strong> — {profile.discordProfile?.displayName||profile.discordProfile?.username||"Discord user"}.</p>
      <p className="account-security-note">Discord signs you in to this same Pup Account. Your Pup username and password remain available if enabled.</p>
     </>:<>
      <p>Link Discord to your existing Pup Account. Your puppies, cloud save, rewards, Friend Code and password login stay with this account.</p>
      <button type="button" className="cta cta-primary stretch" onClick={()=>void linkDiscord()} disabled={discordLinkBusy}>
       <img src={DISCORD_ICON_URL} alt="" width="22" height="22" style={{verticalAlign:"middle",marginRight:8}}/>
       {discordLinkBusy?"Connecting to Discord…":"Link Discord account"}
      </button>
      <p className="account-security-note">Authorize Puppy Clicker's Discord application. A Discord account linked to another Pup Account cannot be transferred here.</p>
     </>}
     {discordLinkMessage?<p className="portal-message" role="status">{discordLinkMessage}</p>:null}
    </section>
    <section className="portal-card">
     <h3 id="account-security">🔐 Username &amp; password login</h3>
     <p>{profile.passwordLoginEnabled===true?"Password login is enabled for your Pup Account. You can change your password here.":"Add a username and password to the Pup Account you're already signed into with Discord. Your cloud progress, Friend Code, and game ownership are preserved."}</p>
     <form className="profile-form account-credentials" onSubmit={saveCredentials} autoComplete="on">
      <label htmlFor="pupCredentialUsername">Pup Account username</label>
      <input id="pupCredentialUsername" type="text" minLength={3} maxLength={20}
       spellCheck="false" autoCapitalize="none" autoCorrect="off" required
       value={credentialUsername} onChange={e=>setCredentialUsername(e.target.value)}
       name="username" autoComplete="username"/>
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
    <PupGiftRequests/>
    <section className="portal-card account-management-card" aria-labelledby="account-management">
     <h3 id="account-management">Account management</h3>
     <p>Refresh your verified account connection, reset a forgotten password, or request account recovery.</p>
     <div className="account-management-actions">
      <a href="/recovery" className="cta cta-secondary">🔐 Account recovery</a>
      <button type="button" className="cta cta-secondary" onClick={()=>void refresh()} disabled={refreshing}>{refreshing?"Refreshing…":"Refresh account details"}</button>
      <button type="button" className="cta cta-secondary" onClick={()=>void signOut()}>Sign out</button>
     </div>
    </section>
   </div>
  </div>
 </div>;
}
function AccountPortal(){return <WebAccountGate><AccountDashboard/></WebAccountGate>;}
function AdminPage(){return <WebAccountGate><AdminPortal/></WebAccountGate>;}
function DiscordCallbackPage(){
 // Process the browser PKCE callback using the verified website account gate.
 return <WebAccountGate><WebLoading stage="callback"/></WebAccountGate>;
}
export default function App(){
 useEffect(()=>installInspectionDeterrent(),[]);
 useEffect(()=>{
  // Root-level styling includes Home, Play, Account, and all website routes.
  const systemTheme=window.matchMedia('(prefers-color-scheme: dark)');
  const primaryMouse=window.matchMedia('(hover: hover) and (pointer: fine)');
  const root=document.documentElement;
  // Touchscreens can retain :hover after a tap (including when a mouse is
  // connected). Only enable the custom pointer for actual mouse/pen input.
  root.dataset.puppyCursorInput=primaryMouse.matches?'mouse':'touch';
  const pointerInput=event=>{
   if(event.pointerType==='touch')root.dataset.puppyCursorInput='touch';
   else if(event.pointerType==='mouse'||event.pointerType==='pen')
    root.dataset.puppyCursorInput='mouse';
  };
  const pointerMovement=event=>{
   if(event.pointerType==='mouse'||event.pointerType==='pen')
    root.dataset.puppyCursorInput='mouse';
  };
  const syncPawCursor=event=>{
   const saved=loadWebPreferences();
   // An in-tab settings change also works when browser storage is unavailable.
   const enabled=typeof event?.detail?.puppyPointerEnabled==='boolean'
    ?event.detail.puppyPointerEnabled
    :saved.puppyPointerEnabled!==false;
   const mode=event?.detail?.themeMode??saved.themeMode;
   const dark=mode==='dark'||(mode!=='light'&&systemTheme.matches);
   document.documentElement.dataset.puppyCursor=enabled?'enabled':'disabled';
   document.documentElement.dataset.puppyCursorTheme=dark?'dark':'light';
  };
  syncPawCursor();
  window.addEventListener(WEB_PREFERENCES_CHANGED,syncPawCursor);
  window.addEventListener('storage',syncPawCursor);
  systemTheme.addEventListener('change',syncPawCursor);
  window.addEventListener('pointerdown',pointerInput,{passive:true});
  window.addEventListener('pointermove',pointerMovement,{passive:true});
  window.addEventListener('pointerover',pointerMovement,{passive:true});
  return()=>{
   window.removeEventListener(WEB_PREFERENCES_CHANGED,syncPawCursor);
   window.removeEventListener('storage',syncPawCursor);
   systemTheme.removeEventListener('change',syncPawCursor);
   window.removeEventListener('pointerdown',pointerInput);
   window.removeEventListener('pointermove',pointerMovement);
   window.removeEventListener('pointerover',pointerMovement);
   delete root.dataset.puppyCursor;
   delete root.dataset.puppyCursorTheme;
   delete root.dataset.puppyCursorInput;
  };
 },[]);
 // Keep historical /register bookmarks, but make /account the one auth endpoint.
 useEffect(()=>{
  if(globalThis.location?.pathname==="/register"){
   const params=new URLSearchParams(globalThis.location.search);
   params.set("mode","register");
   globalThis.history?.replaceState?.(globalThis.history.state,"","/account?"+params.toString());
  }
 },[]);
 const path=typeof window!=="undefined"?window.location.pathname:"/";
 const callback=path==="/auth/discord/callback";
 const demo=isPlayDemoRoute(path,typeof window!=="undefined"?window.location.search:"");
 const errorRoute=path.match(/^\/(?:error\/)?(400|401|403|404|408|409|429|500|502|503|504)\/?$/);
  const page=path==="/"?"home":path==="/chat"?"chat":path==="/account/admin/chat"?"admin-chat":path==="/leaderboard"?"leaderboard":path==="/privacy"?"privacy":/^\/legal\/(privacy|terms)\/?$/.test(path)?"legal":path==="/puppies"?"puppies":
  (/^\/account\/admin(?:\/(?:users|audit|bans|gifts|activity))?\/?$/.test(path)||/^\/account\/bansys\/user=?\/?$/.test(path))?"admin":
  path==="/account"||path==="/register"?"account":path==="/recovery"?"recovery":
  callback?"callback":demo?"demo":path==="/play"?"play":"error";
 return <div className={"site-frame "+(page==="play"?"site-frame-game":"site-frame-page")}>
  <Header page={callback||page==="admin"||page==="admin-chat"?"account":page==="demo"?"play":page}/>
  <main className={page==="play"?"game-mount":"page-mount"}>
   {page==="home"?<Home/>:page==="demo"?<DemoPage/>:page==="puppies"?<div className="landing"><MeetPuppies/></div>:
    page==="account"?<AccountPortal/>:
    page==="privacy"?<WebPrivacy/>:
    page==="legal"?<LegalReader type={path.includes("/terms")?"terms":"privacy"}/>:
    page==="leaderboard"?<Leaderboard/>:
    page==="chat"?<CommunityChat/>:
    page==="admin-chat"?<AdminChat/>:
    page==="admin"?<AdminPage/>:
    page==="recovery"?<RecoveryPage/>:
    page==="callback"?<DiscordCallbackPage/>:
    page==="error"?<WebErrorPage code={errorRoute?Number(errorRoute[1]):404}/>:<NativeApp/>}
  </main>
  <NetworkCheckReporter/>
  <AndroidAppBanner/>
 </div>;
}
