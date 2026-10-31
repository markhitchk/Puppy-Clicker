import React,{useCallback,useEffect,useState} from "react";
import WebAccountGate,{useWebAccount} from "./native/web/AccountGate.jsx";
import {useLanguage} from "./LanguagePicker.jsx";
import "./Leaderboard.css";
const METRICS=Object.freeze({treats:["🍪","lifetimeTreats"],xp:["⭐","playerXp"],puppies:["🐶","puppiesOwned"]});
function LeaderboardBody(){
 const {client}=useWebAccount();
 const {language,t:tr}=useLanguage();
 const [metric,setMetric]=useState("treats");
 const [result,setResult]=useState(null);
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const request=useCallback(async(method,action)=>{
  const session=await client.auth.getSession();
  const token=session.data?.session?.access_token;
  if(!token)throw Error("Sign in again to continue.");
  const response=await fetch("/api/leaderboard"+(method==="GET"?"?metric="+encodeURIComponent(metric):""),{
   method,headers:{"Authorization":"Bearer "+token,...(method==="POST"?{"Content-Type":"application/json"}:{})},
   body:method==="POST"?JSON.stringify({action}):undefined,
   credentials:"same-origin",cache:"no-store"
  });
  const body=await response.json().catch(()=>null);
  if(!response.ok||body?.ok!==true)throw Error(body?.error==="ACCOUNT_INELIGIBLE"?tr("eligibleError"):tr("rankingUnavailable"));
  return body;
 },[client,metric,tr]);
 const load=useCallback(async()=>{
  setLoading(true);setError("");
  try{setResult(await request("GET"));}catch(e){setError(e.message);}
  finally{setLoading(false);}
 },[request]);
 useEffect(()=>{void load();},[load]);
 const setParticipation=async join=>{
  if(busy)return;
  setBusy(true);setError("");
  try{await request("POST",join?"join":"leave");await load();}
  catch(e){setError(e.message);}
  finally{setBusy(false);}
 };
 const format=value=>new Intl.NumberFormat(language==="es"?"es-ES":"en-US").format(value);
 return <div className="leaderboard-page">
  <div className="leaderboard-head">
   <p className="eyebrow">🐾 PUPPY CLICKER · COMMUNITY</p>
   <h1>🏆 {tr("leaderboard")}</h1>
   <p>{tr("rankingsIntro")}</p>
  </div>
  <section className="leaderboard-optin" aria-label="Participation controls">
   <h2>{tr("rankingPrivacy")}</h2>
   <p>{tr("rankingPrivacyDetail")}</p>
   <div className="leaderboard-optin-actions">
    <strong>{loading?tr("checking"):result?.canParticipate===false?tr("leaderboardViewOnly"):result?.participating?"✓ "+tr("participating"):tr("notParticipating")}</strong>
    {result?.canParticipate!==false&&result?<button type="button" className="cta cta-primary" disabled={busy} onClick={()=>void setParticipation(!result.participating)}>{busy?tr("saving"):result.participating?tr("leaveLeaderboard"):tr("joinLeaderboard")}</button>:null}
   </div>
  </section>
  <nav className="leaderboard-metrics" aria-label="Leaderboard metric">
   {Object.entries(METRICS).map(([key,[emoji,label]])=><button key={key} type="button" aria-pressed={metric===key} onClick={()=>setMetric(key)}>{emoji} {tr(label)}</button>)}
  </nav>
  {error?<div role="alert" className="leaderboard-feedback">{error} <button type="button" onClick={()=>void load()}>Retry</button></div>:null}
  {loading?<p role="status" className="leaderboard-feedback">{tr("loadingRankings")}</p>:
   result?<section className="leaderboard-board" aria-label={METRICS[metric][1]+" rankings"}>
    <div className="leaderboard-section-title"><h2>{METRICS[metric][0]} {tr(METRICS[metric][1])}</h2><small>{tr("rankedPlayers",{count:format(result.total)})}</small></div>
    {!result.top?.length?<p className="leaderboard-empty">{tr("emptyRankings")}</p>:
     <table><thead><tr><th scope="col">{tr("rank")}</th><th scope="col">{tr("player")}</th><th scope="col">{tr("score")}</th></tr></thead>
      <tbody>{result.top.map((r,i)=><tr key={r.username+"-"+i}><td>#{r.rank}</td><td><strong>{r.displayName||r.username}</strong><small>@{r.username}</small></td><td>{format(r.score)}</td></tr>)}</tbody></table>}
    {result.participating&&result.self?<p className="leaderboard-self" role="status">{tr("yourRank",{rank:result.self.rank})} · {format(result.self.score)} {tr(METRICS[metric][1])}</p>:null}
   </section>:null}
 </div>;
}
export default function Leaderboard(){return <WebAccountGate><LeaderboardBody/></WebAccountGate>;}
