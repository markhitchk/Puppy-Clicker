import React from "react";
const SOURCE_GROUPS=[
 ["Invitations",[["friend","Friend, family or another player"]]],
 ["Social media",[["snapchat","Snapchat"],["tiktok","TikTok"],["instagram","Instagram"],["facebook","Facebook"],["x","X (Twitter)"]]],
 ["Communities & content",[["discord","Discord"],["reddit","Reddit"],["youtube","YouTube"],["twitch","Twitch"]]],
 ["Search & stores",[["google","Google Search"],["play_store","Google Play Store"]]],
 ["Other",[["other","Other"]]]
];
const detailCopy={
 friend:["Who invited you?","Pup username or name"],
 discord:["Which Discord server or creator?","Server or creator name"],
 reddit:["Which community?","Subreddit or community name"],
 youtube:["Which channel or creator?","Channel or creator name"],
 twitch:["Which channel or creator?","Channel or creator name"],
 google:["What did you search for?","Search terms"],
 play_store:["How did you find us in the store?","Search or recommendation"],
 other:["Where did you find us?","Tell us a little more"]
};
export default function JoinSourceFields({idPrefix,source,onSourceChange,details,onDetailsChange,disabled,inviteCode}){
 const sourceId=idPrefix+"-join-source",detailsId=idPrefix+"-join-details",helpId=idPrefix+"-join-help";
 const [detailLabel,placeholder]=detailCopy[source]||["Where did you see us?","Account, creator or post"];
 const fields=<div className="account-join-source">
  <div className="account-discovery-title"><span aria-hidden="true">🐾</span><div><strong>Discover Puppy Clicker</strong><small>Help us understand how players find the game.</small></div></div>
  <label htmlFor={sourceId}>How did you find us? <span className="account-discovery-optional">Optional</span></label>
  <select id={sourceId} name="join-source" value={source} disabled={disabled} aria-describedby={helpId}
   onChange={event=>{onSourceChange(event.target.value);onDetailsChange("");}}>
   <option value="">Select a discovery source</option>
   {SOURCE_GROUPS.map(([group,options])=><optgroup key={group} label={group}>{options.map(([value,label])=><option key={value} value={value}>{label}</option>)}</optgroup>)}
  </select>
  {source?<><label htmlFor={detailsId}>{detailLabel} <span className="account-discovery-optional">Optional</span></label>
   <input id={detailsId} name="join-details" type="text" maxLength={120} placeholder={placeholder}
    value={details} onChange={event=>onDetailsChange(event.target.value)} disabled={disabled}/></>:null}
  <small id={helpId}>You can skip this. Verified invitation links are recorded automatically.</small>
 </div>;
 return inviteCode?<details className="account-discovery-fallback">
  <summary>Optional discovery answer if the invitation cannot be verified</summary>
  {fields}
 </details>:fields;
}
