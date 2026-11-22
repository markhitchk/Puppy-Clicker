import React,{useEffect,useState,useRef} from "react";
const labels={pending:"Pending",ready:"Eligible · waiting",queued:"In notifications",rewarded:"Rewarded",ineligible:"Not eligible"};
export default function ReferralRewards({client,accountId}){
 const [summary,setSummary]=useState(null);
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
 return <div className="profile-form" aria-label="Invite rewards">
  <h3>🎁 Invite rewards</h3>
  <p>Earn one gift per eligible new Pup Account created through your invite link: treats, tickets, bones, Pup Coins, casino chips or a puppy. Rewards arrive one at a time in game notifications. Your friend must have an active account for at least 24 hours and record 100 legitimate website taps.</p>
  {summary&&<>
   <dl className="account-shortcut-grid">
    <div><dt>Total signups</dt><dd>{summary.total}</dd></div>
    <div><dt>Pending</dt><dd>{summary.pending}</dd></div>
    <div><dt>Eligible · waiting</dt><dd>{summary.ready}</dd></div>
    <div><dt>Rewarded</dt><dd>{summary.rewarded}</dd></div>
    <div><dt>In notifications</dt><dd>{summary.queued}</dd></div>
   </dl>
   <button type="button" className="cta cta-primary" onClick={()=>window.location.assign("/play?notifications=1")}>Open game notifications</button>
   <h4>Invited players</h4>
   {!summary.history.length?<p>No verified invite signups yet. Share your personal link to get started!</p>:<ul className="profile-form" style={{listStyle:"none",padding:0}}>
    {summary.history.map((row,i)=><li key={row.username+row.joinedAt+i} style={{padding:"8px 0",borderBottom:"1px solid currentColor"}}>
     <strong>@{row.username}</strong><div><small>{new Date(row.joinedAt).toLocaleDateString()} · {labels[row.status]||"Unknown"}{row.reward?" · "+row.reward:""}</small></div>
    </li>)}
   </ul>}
   {summary.total>50&&<small>Showing the latest 50 signups. Totals include all referrals.</small>}
  </>}
  {loading&&<p role="status">Loading invite history…</p>}
  {failed&&<p role="alert">Invite history is temporarily unavailable.</p>}
  <button type="button" className="cta cta-secondary" onClick={()=>void refresh()} disabled={loading}>Refresh invite history</button>
  <small>Only verified new accounts count. Existing accounts, self-referrals and manual discovery answers do not earn rewards. No friend requests are sent automatically.</small>
 </div>;
}
