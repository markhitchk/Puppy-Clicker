import React from "react";
import "./PupAccountBanned.css";

const formatDate=value=>{
 if(!value)return null;
 const date=new Date(value);
 return Number.isNaN(date.getTime())?null:date.toLocaleString(undefined,{dateStyle:"long",timeStyle:"short"});
};

/** Read-only notice. Supabase retains the session; the server still rejects gameplay. */
export default function PupAccountBanned({account,onRefresh,onSignOut}){
 const ban=account?.ban||{};
 const username=account?.username||"player";
 return <main className="pup-banned-wrap" data-testid="pup-account-banned">
  <section className="pup-banned-card" aria-labelledby="pup-banned-title">
   <div className="pup-banned-symbol" aria-hidden="true">🛡️</div>
   <p className="pup-banned-eyebrow">PUPPY CLICKER · ACCOUNT STANDING</p>
   <h1 id="pup-banned-title">Account Banned</h1>
   <p className="pup-banned-player">Pup Account <strong>@{username}</strong></p>
   <p className="pup-banned-description">Your account is still signed in, but access to Puppy Clicker gameplay and protected account actions is temporarily disabled or permanently restricted.</p>
   <dl className="pup-banned-details">
    <div><dt>Reason</dt><dd>{ban.reason||"Account restricted by Puppy Clicker moderation."}</dd></div>
    <div><dt>Ban ID</dt><dd>{ban.id||"Not available"}</dd></div>
    <div><dt>Issued</dt><dd>{formatDate(ban.issuedAt)||"Not available"}</dd></div>
    <div><dt>Expires</dt><dd>{ban.expiresAt?formatDate(ban.expiresAt)||"Not available":"Permanent ban"}</dd></div>
   </dl>
   <p className="pup-banned-note">This restriction is enforced across Puppy Clicker on the web and Android. You can check again after a temporary ban expires or after a moderator revokes it. Contact official Puppy Clicker support to appeal.</p>
   <div className="pup-banned-actions">
    <button type="button" className="pup-banned-primary" onClick={onRefresh}>↻ Check ban status</button>
    <a href="/recovery" className="pup-banned-secondary">Account recovery</a>
    <button type="button" className="pup-banned-secondary" onClick={onSignOut}>Sign out</button>
   </div>
  </section>
 </main>;
}
