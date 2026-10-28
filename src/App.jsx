import React,{useEffect,useState} from "react";
import NativeApp from "./native/App.jsx";
import WebAccountGate,{useWebAccount} from "./native/web/AccountGate.jsx";
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
    <div className="hero-pup"><img src="/assets/v1/v1_classic.png" alt="Classic Puppy Clicker puppy" /></div>
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
   <div><p className="eyebrow">YOUR GAME · YOUR ACCOUNT</p><h2>Manage your Pup Account</h2><p>Sign in with a Pup username or the Puppy Clicker Discord login, check your account, and update your display name without opening the game.</p><a href="/account" className="cta cta-secondary">Open Account Management</a></div>
   <div className="account-preview"><span>🐾</span><strong>Pup Account</strong><p>Verified login · Linked progress · Account settings</p></div>
  </section>
  <footer className="site-footer"><span>© {new Date().getFullYear()} Harley's Studios · Puppy Clicker</span><span>Made for puppy fans 🐶</span></footer>
 </div>;
}
function AccountDashboard(){
 const {client,pupAccount,signOut}=useWebAccount();
 const [profile,setProfile]=useState(pupAccount);
 const [displayName,setDisplayName]=useState(pupAccount.displayName||pupAccount.username||"");
 const [editing,setEditing]=useState(false);
 const [saving,setSaving]=useState(false);
 const [status,setStatus]=useState("");
 const [cloud,setCloud]=useState("Checking protected cloud save…");
 const [refreshing,setRefreshing]=useState(false);
 const refresh=async()=>{
  setRefreshing(true);setStatus("");
  try{
   const account=await verifyPuppySession(client);
   setProfile(account);setDisplayName(account.displayName||account.username||"");
   const {data,error}=await client.functions.invoke("pup-web-auth",{body:{action:"cloud-save-read"}});
   if(error||!data?.verified)throw Error("CLOUD_CHECK_FAILED");
   setCloud(data.cloud?.exists===true?"Existing cloud save found":"No cloud save available yet");
  }catch{
   setCloud("Cloud status unavailable");
   setStatus("Could not refresh your account. Try again.");
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
 return <div className="account-content">
  <div className="account-heading"><p className="eyebrow">🐾 PUP ACCOUNT</p><h1>Your account</h1><p>View and manage your verified Puppy Clicker identity, without showing protected account or backend identifiers.</p></div>
  <div className="account-grid">
   <section className="portal-card profile-main">
    <div className="profile-head"><img src={logo} alt="" /><div><small>Signed in as</small><h2>{profile.displayName||profile.username}</h2><p>@{profile.username}</p></div><span className="verified">✓ Connected</span></div>
    <div className="portal-divider"></div>
    <h3>Profile settings</h3>
    {editing?<form onSubmit={save} className="profile-form"><label htmlFor="pupDisplayName">Display name</label><input id="pupDisplayName" value={displayName} maxLength={24} onChange={e=>setDisplayName(e.target.value)} autoComplete="nickname"/><div className="form-actions"><button className="cta cta-primary" disabled={saving} type="submit">{saving?"Saving…":"Save display name"}</button><button className="cta cta-secondary" type="button" onClick={()=>{setEditing(false);setDisplayName(profile.displayName||profile.username);}}>Cancel</button></div></form>:
     <div className="profile-row"><span><small>Display name</small><strong>{profile.displayName||profile.username}</strong></span><button className="small-action" onClick={()=>setEditing(true)}>Edit name</button></div>}
    <div className="profile-row"><span><small>Pup username</small><strong>@{profile.username}</strong></span><span className="metadata">Account identifier</span></div>
    <div className="profile-row"><span><small>Discord</small><strong>{profile.discordUserId?"Connected":"Not connected"}</strong></span><span className="metadata">Puppy Clicker login</span></div>
    {status?<p className="portal-message" role="status">{status}</p>:null}
   </section>
   <div className="portal-stack">
    <section className="portal-card"><h3>☁️ Gameplay progress</h3><p>Gameplay uses the same protected Pup Account cloud-save service as the connected game.</p><p className="cloud-status">{cloud}</p><a href="/play" className="cta cta-primary stretch">Continue playing</a></section>
    <section className="portal-card"><h3>🔐 Account security</h3><p>Sign in through your Pup username or Discord. Password and recovery changes are not available from this web page yet.</p><button type="button" className="small-action" onClick={()=>void refresh()} disabled={refreshing}>{refreshing?"Refreshing…":"Refresh account"}</button><button className="cta cta-secondary stretch" type="button" onClick={()=>void signOut()}>Sign out</button></section>
   </div>
  </div>
 </div>;
}
function AccountPortal(){return <WebAccountGate><AccountDashboard/></WebAccountGate>;}
export default function App(){
 const path=typeof window!=="undefined"?window.location.pathname:"/";
 const page=path==="/account"?"account":path==="/play"||path.startsWith("/auth/discord/")?"play":"home";
 return <div className={"site-frame "+(page==="play"?"site-frame-game":"site-frame-page")}>
  <Header page={path.startsWith("/auth/")?"account":page}/>
  <main className={page==="play"?"game-mount":"page-mount"}>
   {page==="home"?<Home/>:page==="account"?<AccountPortal/>:<NativeApp/>}
  </main>
 </div>;
}
