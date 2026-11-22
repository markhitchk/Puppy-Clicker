import React,{useEffect,useState,useRef} from "react";
const labels={pending:"Pending",ready:"Ready to claim",rewarded:"Rewarded",ineligible:"Not eligible"};
export default function ReferralRewards({client,accountId}){
 const [summary,setSummary]=useState(null),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const [loading,setLoading]=useState(true),[failed,setFailed]=useState(false);
 const active=useRef(0);
 async function refresh(){
  const id=++active.current;setLoading(true);setFailed(false);
  try{
   const {data,error}=await client.functions.invoke("pup-web-auth",{body:{action:"referral-status"}});
   if(error||!data?.referrals)throw Error("REFERRAL_STATUS");
   if(active.current===id)setSummary(data.referrals);
  }catch{if(active.current===id){setSummary(null);setFailed(true);}}
  finally{if(active.current===id)setLoading(false);}
 }
 useEffect(()=>{void refresh();return ()=>{active.current++;};},[client,accountId]);
 async function claim(){
  if(busy||!summary?.ready)return;
  setBusy(true);setMessage("");
  try{
   const {data,error}=await client.functions.invoke("pup-web-auth",{body:{action:"referral-claim"}});
   if(error||!data?.referrals)throw Error("REFERRAL_CLAIM");
   const {claimed,treats}=data.referrals;
   setMessage(claimed?"Reward received! "+Number(treats).toLocaleString()+" treats added to your cloud save.":"No rewards are currently ready.");
  }catch{setMessage("Could not claim rewards. Refresh your invite history before retrying.");}
  finally{await refresh();setBusy(false);}
 }
 return <div className="profile-form" aria-label="Invite rewards">
  <h3>🎁 Invite rewards</h3>
  <p>Earn 500 treats for every eligible new Pup Account created through your invite link. Your friend must have an active account for at least 24 hours and record 100 legitimate website taps.</p>
  {summary&&<>
   <dl className="account-shortcut-grid">
    <div><dt>Total signups</dt><dd>{summary.total}</dd></div>
    <div><dt>Pending</dt><dd>{summary.pending}</dd></div>
    <div><dt>Ready to claim</dt><dd>{summary.ready}</dd></div>
    <div><dt>Rewarded</dt><dd>{summary.rewarded}</dd></div>
    <div><dt>Treats earned</dt><dd>{Number(summary.earned).toLocaleString()}</dd></div>
   </dl>
   <button type="button" className="cta cta-primary" onClick={()=>void claim()} disabled={busy||loading||!summary.ready}>{busy?"Claiming…":summary.ready?"Claim "+(Math.min(summary.ready,20)*summary.rewardPerInvite).toLocaleString()+" treats":"No rewards ready"}</button>
   <h4>Invited players</h4>
   {!summary.history.length?<p>No verified invite signups yet. Share your personal link to get started!</p>:<ul className="profile-form" style={{listStyle:"none",padding:0}}>
    {summary.history.map((row,i)=><li key={row.username+row.joinedAt+i} style={{padding:"8px 0",borderBottom:"1px solid currentColor"}}>
     <strong>@{row.username}</strong><div><small>{new Date(row.joinedAt).toLocaleDateString()} · {labels[row.status]||"Unknown"}{row.treats>0?" · "+row.treats+" treats":""}</small></div>
    </li>)}
   </ul>}
   {summary.total>50&&<small>Showing the latest 50 signups. Totals include all referrals.</small>}
  </>}
  {loading&&<p role="status">Loading invite history…</p>}
  {failed&&<p role="alert">Invite history is temporarily unavailable.</p>}
  <button type="button" className="cta cta-secondary" onClick={()=>void refresh()} disabled={loading||busy}>Refresh invite history</button>
  {message&&<p role="status">{message}</p>}
  <small>Only verified new accounts count. Existing accounts, self-referrals and manual discovery answers do not earn rewards. No friend requests are sent automatically.</small>
 </div>;
}
