import React from "react";

const STAGES={
 account:{eyebrow:"PUP ACCOUNT",title:"Verifying your Pup Account",detail:"Checking your secure sign-in and account status."},
 callback:{eyebrow:"SECURE SIGN-IN",title:"Completing sign-in",detail:"Confirming your identity with Puppy Clicker."},
 progress:{eyebrow:"CLOUD PROGRESS",title:"Loading your saved puppies",detail:"Verifying protected progress before gameplay begins."},
 startup:{eyebrow:"PUPPY CLICKER",title:"Getting your puppy world ready",detail:"Preparing your puppies, rewards and game settings."}
};

// One public loading treatment across account, OAuth, cloud progress and game startup.
// Intentionally does not invent a progress percentage or expose backend identifiers.
export default function WebLoading({stage="startup",detail,compact=false}){
 const content=STAGES[stage]||STAGES.startup;
 return <div className={"web-loading"+(compact?" web-loading-compact":"")} role="status" aria-live="polite" aria-label={content.title}>
  <div className="web-loading-glow" aria-hidden="true"/>
  <div className="web-loading-panel">
   <div className="web-loading-mascot" aria-hidden="true">
    <img src="/assets/logos/puppy_clicker.png" alt="" width="108" height="108"/>
    <span className="web-loading-spark">✦</span>
   </div>
   <p className="web-loading-eyebrow">🐾 {content.eyebrow}</p>
   <h1>{content.title}</h1>
   <p className="web-loading-detail">{detail||content.detail}</p>
   <div className="web-loading-track" aria-hidden="true"><div className="web-loading-indicator"/></div>
   <p className="web-loading-footnote">Protected Pup Account · Your progress stays safe</p>
  </div>
 </div>;
}
