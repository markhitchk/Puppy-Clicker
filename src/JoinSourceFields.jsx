import React from "react";
const SOURCES=[
 ["friend","A friend, family member or another player"],
 ["discord","A Discord server or message"],
 ["youtube","YouTube"],["tiktok","TikTok"],["instagram","Instagram"],
 ["reddit","Reddit"],["google","Google search"],["play_store","Google Play Store"],
 ["other","Somewhere else"]
];
export default function JoinSourceFields({idPrefix,source,onSourceChange,details,onDetailsChange,disabled}){
 const sourceId=idPrefix+"-join-source",detailsId=idPrefix+"-join-details";
 return <div className="account-join-source">
  <label htmlFor={sourceId}>🐾 How did you hear about Puppy Clicker? (optional)</label>
  <select id={sourceId} name="join-source" value={source} disabled={disabled}
   onChange={event=>{onSourceChange(event.target.value);onDetailsChange("");}}>
   <option value="">Choose an option or skip</option>
   {SOURCES.map(([value,label])=><option key={value} value={value}>{label}</option>)}
  </select>
  {source?<><label htmlFor={detailsId}>{source==="friend"?"Who invited you? (optional)":"Where did you see us? (optional)"}</label>
   <input id={detailsId} name="join-details" type="text" maxLength={120}
    placeholder={source==="friend"?"Their Pup username or name":"Server, channel, creator or website"}
    value={details} onChange={event=>onDetailsChange(event.target.value)} disabled={disabled}/></>:null}
  <small>This helps us understand how players find the game. No invite code or reward is required.</small>
 </div>;
}
