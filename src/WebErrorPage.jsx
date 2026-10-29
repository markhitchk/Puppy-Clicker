import React from "react";

export const WEB_ERROR_CATALOG=Object.freeze({
 400:{title:"Invalid request",subtitle:"That request couldn't be understood.",help:"Check the website address and try again."},
 401:{title:"Sign-in required",subtitle:"Your Pup Account session is needed.",help:"Sign in to continue with your saved puppies."},
 403:{title:"Access unavailable",subtitle:"This page isn't available to your account.",help:"Check your account status or contact Puppy Clicker support."},
 404:{title:"Page not found",subtitle:"This puppy wandered off the map.",help:"The address may have changed or the page may no longer exist."},
 408:{title:"Request timed out",subtitle:"That took longer than expected.",help:"Check your connection and try again."},
 409:{title:"Progress needs attention",subtitle:"Your protected cloud progress couldn't be opened yet.",help:"Refresh progress or check your Pup Account connection. No save data was deleted."},
 429:{title:"Too many requests",subtitle:"You've reached a temporary request limit.",help:"Try again later; repeated requests won't help."},
 500:{title:"Something went wrong",subtitle:"Puppy Clicker couldn't load this page.",help:"Please retry. Your protected account and progress haven't been reset."},
 502:{title:"Service unavailable",subtitle:"A service did not respond correctly.",help:"Please retry after checking your internet connection."},
 503:{title:"Temporarily unavailable",subtitle:"Puppy Clicker is having trouble connecting.",help:"Please try again shortly. We haven't modified your saved progress."},
 504:{title:"Connection timed out",subtitle:"The server took too long to respond.",help:"Please retry once your connection is stable."}
});
export const getWebError=(code)=>WEB_ERROR_CATALOG[Number(code)]||WEB_ERROR_CATALOG[404];

export default function WebErrorPage({code=404,title,description,help,onRetry,showRecovery=false}){
 const details=getWebError(code);
 const status=WEB_ERROR_CATALOG[Number(code)]?Number(code):404;
 return <div className="web-error-page">
  <section className="web-error-panel" role="alert">
   <img src="/assets/logos/puppy_clicker.png" alt="" width="84" height="84"/>
   <p className="eyebrow">🐾 PUPPY CLICKER · ERROR</p>
   <p className="web-error-code" aria-label={"Error "+status}>{status}</p>
   <h1>{title||details.title}</h1>
   <p className="web-error-subtitle">{description||details.subtitle}</p>
   <p className="web-error-help">{help||details.help}</p>
   <div className="web-error-actions">
    {onRetry?<button type="button" className="cta cta-primary" onClick={onRetry}>↻ Try Again</button>:null}
    <a href="/" className="cta cta-primary">⌂ Back to Home</a>
    <a href="/account" className="cta cta-secondary">Pup Account</a>
    {showRecovery?<a href="/recovery" className="cta cta-secondary">Account Recovery</a>:null}
   </div>
   <p className="web-error-footnote">Error {status} · No private account data is displayed</p>
  </section>
 </div>;
}
