import React,{useCallback,useEffect,useState} from "react";
import PupEyeBrand from "./PupEyeBrand.jsx";
import {useWebAccount} from "./native/web/AccountGate.jsx";
import {accountStandingPresentation,androidConnectionPresentation,
 fairplayPresentation,gameplayPresentation} from "./pupeyeStatusPresentation.js";
import "./PupEyePages.css";

const displayTime=value=>{
 if(!value)return null;
 const date=new Date(value);
 if(Number.isNaN(date.getTime()))return null;
 return date.toLocaleString(undefined,{dateStyle:"medium",timeStyle:"short"});
};
const FEATURES=[
 {icon:"🔐",title:"Verified Pup Accounts",text:"Protected game requests are linked to your signed-in Pup Account. A browser cannot claim another player's identity by supplying a username."},
 {icon:"🐾",title:"Fair-play tap checks",text:"The game server enforces tap spacing and validates rewards before saving. Excessively fast requests can be rejected without awarding Treats."},
 {icon:"📈",title:"Suspicious activity review",text:"PupEye tracks unusual sustained tap volume and repeated rate violations. Browser timing summaries are only supporting clues, never proof by themselves."},
 {icon:"🛡️",title:"Protected cloud progress",text:"Gameplay uses authoritative cloud saves and checks for conflicting or repeated transactions to help prevent duplicated rewards."},
 {icon:"⏳",title:"Proportionate responses",text:"PupEye can show warnings and briefly pause tapping for repeated extreme behavior. A temporary tap hold is not a permanent account ban."},
 {icon:"👁️",title:"Human oversight",text:"Authorized staff can review fair-play cases, dismiss false positives and clear temporary holds. Permanent sanctions are not automatically issued by the web detector."}
];
const QUESTIONS=[
 {q:"Can PupEye tell if I have an autoclicker installed?",a:"No. Ordinary websites cannot reliably identify software installed on your device. PupEye Web monitors authorized game requests and unusual tapping behavior instead of scanning your computer or phone."},
 {q:"Could very fast tapping trigger a warning?",a:"Yes. Server-side tap limits always apply, and sustained unusual activity can create a review case. An isolated fast click or a browser timing signal alone does not cause an automatic permanent ban."},
 {q:"What if I use accessibility features?",a:"Input tools can create unusual timing patterns. PupEye treats browser-reported timing as untrusted evidence, and staff can dismiss cases or remove a temporary tap hold. Do not assume a warning proves cheating."},
 {q:"What information does PupEye Web keep?",a:"The web fair-play system records account-linked server tap counts, rate-limit anomalies, review decisions and limited aggregate timing summaries. Review cases are scheduled for deletion after 90 days. It does not upload raw cursor coordinates or raw click timestamps for this feature."},
 {q:"Is PupEye on Android the same system?",a:"They share Puppy Clicker's account and gameplay protections, but browser checks do not provide Android device attestation. Android installation and save-integrity protections are separate."},
 {q:"How do I check my own status?",a:"Sign in to your Pup Account, then open PupEye Status. It shows your server-verified account standing, browser gameplay access and active fair-play warning or temporary hold. Internal investigation evidence remains private."}
];
function PageCrumbs({current}){
 return <nav className="pupeye-crumbs" aria-label="Breadcrumb">
  <a href="/">Puppy Clicker</a><span aria-hidden="true">/</span>
  {current==="PupEye"?<span aria-current="page">PupEye</span>:<><a href="/pupeye">PupEye</a><span aria-hidden="true">/</span><span aria-current="page">Account status</span></>}
 </nav>;
}
function StatusCard({label,title,detail,tone="neutral",children}){
 return <article className={"pupeye-status-card pupeye-tone-"+tone}>
  <span className="pupeye-status-card__label">{label}</span>
  <h3>{title}</h3>
  <p>{detail}</p>
  {children}
 </article>;
}
export function PupEyeOverview(){
 useEffect(()=>{const old=document.title;document.title="PupEye Anticheat | Puppy Clicker";return()=>{document.title=old;};},[]);
 return <div className="pupeye-page" data-testid="pupeye-overview">
  <PageCrumbs current="PupEye"/>
  <section className="pupeye-hero">
   <div className="pupeye-hero-copy">
    <p className="pupeye-eyebrow">PUPPY CLICKER · ACCOUNT AND GAMEPLAY PROTECTION</p>
    <h1><PupEyeBrand label="PupEye Anticheat"/></h1>
    <p className="pupeye-lead">A watchful guardian for fair gameplay and safer Pup Accounts.</p>
    <p>PupEye protects Puppy Clicker's browser game through verified accounts, authoritative gameplay rules, rate limits and reviewable fair-play signals. Its job is to protect the puppies, players and the game economy while leaving room to correct mistakes.</p>
    <div className="pupeye-actions">
     <a className="pupeye-button pupeye-button--primary" href="/pupeye/status">👁️ Check my PupEye status</a>
     <a className="pupeye-button pupeye-button--quiet" href="/account">Manage Pup Account</a>
    </div>
    <small className="pupeye-footnote">The status page checks only your own verified account. No public player lookup is provided.</small>
   </div>
   <div className="pupeye-hero-art" aria-hidden="true">
    <div className="pupeye-hero-halo"/>
    <img src="/assets/logos/PupEye.png" alt=""/>
    <div className="pupeye-hero-art-caption"><span>●</span> WEB PUP EYE · ACTIVE SERVER GUARDS</div>
   </div>
  </section>
  <section className="pupeye-section" aria-labelledby="pupeye-features">
   <div className="pupeye-section-heading"><p className="pupeye-eyebrow">WHAT IT DOES</p><h2 id="pupeye-features">Six layers of protection</h2><p>These are the protections currently supported by the web integration.</p></div>
   <div className="pupeye-feature-grid">{FEATURES.map(feature=><article className="pupeye-feature" key={feature.title}>
    <div className="pupeye-feature-icon" aria-hidden="true">{feature.icon}</div>
    <h3>{feature.title}</h3><p>{feature.text}</p>
   </article>)}</div>
  </section>
  <section className="pupeye-section pupeye-explainer" aria-labelledby="pupeye-response">
   <div><p className="pupeye-eyebrow">FAIR-PLAY PROCESS</p><h2 id="pupeye-response">Detect, protect, review</h2><p>Unusual behavior is not automatically proof of cheating. PupEye's web safeguards start with server-side validation and can escalate to temporary tap-only restrictions after repeated extreme activity.</p></div>
   <ol className="pupeye-process">
    <li><strong>Verify</strong><span>The server checks the account and gameplay transaction.</span></li>
    <li><strong>Observe</strong><span>Unusual repeated requests or sustained tap volume may create a review case.</span></li>
    <li><strong>Protect</strong><span>Rejected taps earn nothing. Some repeated extreme patterns can temporarily pause tapping.</span></li>
    <li><strong>Review</strong><span>Staff may confirm or dismiss a case and release a tap hold. There is no automatic permanent ban from web fair-play detection.</span></li>
   </ol>
  </section>
  <section className="pupeye-section" aria-labelledby="pupeye-faq">
   <div className="pupeye-section-heading"><p className="pupeye-eyebrow">QUESTIONS</p><h2 id="pupeye-faq">PupEye FAQ</h2></div>
   <div className="pupeye-faq">{QUESTIONS.map(item=><details key={item.q}>
    <summary>{item.q}</summary><p>{item.a}</p>
   </details>)}</div>
  </section>
  <section className="pupeye-final-cta">
   <div><h2>Check on your Pup Account</h2><p>Find out whether your account is verified, if web gameplay is available and whether PupEye has an active warning or temporary tap hold.</p></div>
   <a className="pupeye-button pupeye-button--primary" href="/pupeye/status">View my status</a>
  </section>
  <footer className="pupeye-footer"><a href="/legal/privacy">Privacy Policy</a><a href="/account/privacy">Privacy Center</a><a href="/recovery">Account recovery</a></footer>
 </div>;
}

export function PupEyeAccountStatus(){
 useEffect(()=>{const old=document.title;document.title="My PupEye Status | Puppy Clicker";return()=>{document.title=old;};},[]);
 const {client,pupAccount}=useWebAccount();
 const banned=pupAccount?.status==="BANNED";
 const [fairplay,setFairplay]=useState(null);
 const [loading,setLoading]=useState(!banned);
 const [problem,setProblem]=useState("");
 const [checkedAt,setCheckedAt]=useState(null);
 const refresh=useCallback(async()=>{
  if(banned||!client||!pupAccount?.id)return;
  setLoading(true);setProblem("");
  try{
   // The Edge Function resolves the account from this browser's authenticated
   // session. No account ID, username or private score is sent from the page.
   const {data,error}=await client.functions.invoke("pup-web-auth",{
    body:{action:"fairplay-status"}
   });
   if(error||!data?.fairplay||
      !["clear","warning","restricted"].includes(data.fairplay.status))
    throw new Error("FAIRPLAY_STATUS_UNAVAILABLE");
   setFairplay(data.fairplay);setCheckedAt(new Date());
  }catch{
   setFairplay(null);
   setProblem("PupEye could not confirm your current fair-play status. Your account has not been marked clear or restricted by this page. Please retry.");
  }finally{setLoading(false);}
 },[client,pupAccount?.id,banned]);
 useEffect(()=>{
  if(banned)return;
  void refresh();
  const timer=setInterval(()=>{
   if(document.visibilityState==="visible")void refresh();
  },60000);
  return()=>clearInterval(timer);
 },[refresh,banned]);
 const standing=accountStandingPresentation(pupAccount);
 const gameplay=gameplayPresentation(pupAccount);
 const connection=androidConnectionPresentation(pupAccount);
 const timing=fairplayPresentation(fairplay);
 const username=pupAccount?.username||"player";
 const ban=pupAccount?.ban||{};
 return <div className="pupeye-page" data-testid="pupeye-account-status">
  <PageCrumbs current="Account status"/>
  <header className="pupeye-status-hero">
   <p className="pupeye-eyebrow">PUPPY CLICKER · PRIVATE ACCOUNT CHECK</p>
   <h1><PupEyeBrand label="My PupEye status"/></h1>
   <p>Viewing the security standing for <strong>@{username}</strong>. This page only checks the Pup Account in your current verified session.</p>
   <div className="pupeye-actions">
    <button className="pupeye-button pupeye-button--primary" type="button" disabled={loading}
     onClick={banned?()=>window.location.reload():()=>void refresh()}>
     {loading?"Checking PupEye…":"↻ Refresh my status"}
    </button>
    <a className="pupeye-button pupeye-button--quiet" href="/pupeye">About PupEye</a>
   </div>
   <p className="pupeye-status-checked" role="status" aria-live="polite">
    {banned?"Your account restriction is confirmed by the sign-in service.":
     loading&&!checkedAt?"Contacting PupEye…":checkedAt?"Last confirmed fair-play check: "+displayTime(checkedAt):
     "No fair-play check completed yet."}
   </p>
  </header>
  {problem?<div className="pupeye-error" role="alert">{problem}</div>:null}
  {banned?<section className="pupeye-sanction" aria-labelledby="pupeye-sanction-title">
   <h2 id="pupeye-sanction-title">Account restriction in effect</h2>
   <p>Your Pup Account remains signed in, but gameplay is blocked by a separate moderation action. This is different from a temporary PupEye tap hold.</p>
   <dl>
    <div><dt>Reason</dt><dd>{ban.reason||"An account moderation restriction is active."}</dd></div>
    <div><dt>Public ban ID</dt><dd>{ban.id||"Not available"}</dd></div>
    <div><dt>Issued</dt><dd>{displayTime(ban.issuedAt)||"Not available"}</dd></div>
    <div><dt>Expires</dt><dd>{ban.expiresAt?displayTime(ban.expiresAt)||"Not available":"Permanent unless lifted by staff"}</dd></div>
   </dl>
   <p>Contact official Puppy Clicker support if you believe this restriction is incorrect.</p>
  </section>:null}
  <section className="pupeye-section" aria-labelledby="pupeye-check-heading">
   <div className="pupeye-section-heading">
    <p className="pupeye-eyebrow">YOUR ACCOUNT · VERIFIED SOURCE</p>
    <h2 id="pupeye-check-heading">Current protection summary</h2>
    <p>Account standing and gameplay access come from your verified Pup Account. Fair-play warnings and holds come from PupEye's authenticated server endpoint.</p>
   </div>
   <div className="pupeye-status-grid">
    <StatusCard label="Account standing" {...standing}/>
    <StatusCard label="Web gameplay" {...gameplay}/>
    <StatusCard label="PupEye Web fair play"
     {...(banned?{title:"Not checked during an account ban",detail:"A separate moderation restriction is active. The fair-play endpoint is not queried for banned accounts.",tone:"neutral"}:loading&&!fairplay?{title:"Checking…",detail:"Contacting the verified PupEye server.",tone:"neutral"}:timing)}>
     {!banned&&!problem&&fairplay?.status==="restricted"&&fairplay?.restrictedUntil?
      <p className="pupeye-tap-expiry">Expected end: <strong>{displayTime(fairplay.restrictedUntil)||"Time unavailable"}</strong></p>:null}
     {!banned&&!problem&&fairplay?.message&&fairplay.status!=="clear"?
      <p className="pupeye-server-message">{fairplay.message}</p>:null}
    </StatusCard>
    <StatusCard label="Android / web connection" title={connection.title} detail={connection.detail}/>
   </div>
  </section>
  <section className="pupeye-section pupeye-next-steps">
   <h2>What your status means</h2>
   <p><strong>No active warning</strong> means PupEye is not currently reporting a web tapping warning or temporary hold. Normal anti-cheat checks still run. <strong>Warning</strong> is not a ban; <strong>temporary tap hold</strong> pauses tapping only. Account bans are a separate moderation action.</p>
   <p>If your status appears incorrect, refresh it and contact Puppy Clicker support. Staff can review fair-play cases without exposing private detection data to other players.</p>
   <div className="pupeye-actions">
    <a href="/account" className="pupeye-button pupeye-button--quiet">My Pup Account</a>
    <a href="/recovery" className="pupeye-button pupeye-button--quiet">Account recovery</a>
    <a href="/legal/privacy" className="pupeye-button pupeye-button--quiet">Privacy Policy</a>
   </div>
  </section>
 </div>;
}
