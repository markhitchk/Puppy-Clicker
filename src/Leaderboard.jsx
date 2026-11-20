import React,{useCallback,useEffect,useState} from "react";
import WebAccountGate,{useWebAccount} from "./native/web/AccountGate.jsx";
import {useLanguage} from "./LanguagePicker.jsx";
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
  const response=await fetch("/api/leaderboard"+(method==="GET"?"?view=unified&metric="+encodeURIComponent(metric):""),{
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
 const format=value=>typeof value==="number"?new Intl.NumberFormat(language==="es"?"es-ES":"en-US").format(value):"—";
 return <div className="leaderboard-page"><div className="leaderboard-unified">
  <div className="leaderboard-head">
   <p className="eyebrow">🐾 PUPPY CLICKER · COMMUNITY</p>
   <h1>🏆 {tr("leaderboard")}</h1>
   <p>{tr("rankingsIntro")}</p>
  </div>
  <section className="leaderboard-optin" aria-label="Participation controls">
   <h2>{tr("rankingPrivacy")}</h2>
   <details className="leaderboard-privacy-detail"><summary>{language==="es"?"Qué datos se muestran":"What information is shared"}</summary><p>{tr("rankingPrivacyDetail")}</p></details>
   <div className="leaderboard-optin-actions">
    <strong>{loading?tr("checking"):result?.canParticipate===false?tr("leaderboardViewOnly"):result?.participating?"✓ "+tr("participating"):tr("notParticipating")}</strong>
    {result?.canParticipate!==false&&result?<button type="button" className="cta cta-primary" disabled={busy} onClick={()=>void setParticipation(!result.participating)}>{busy?tr("saving"):result.participating?tr("leaveLeaderboard"):tr("joinLeaderboard")}</button>:null}
   </div>
  </section>
  <nav className="leaderboard-metrics" aria-label="Leaderboard metric"><span className="leaderboard-sort-label">{language==="es"?"Ordenar por":"Rank by"}</span>
   {Object.entries(METRICS).map(([key,[emoji,label]])=><button key={key} type="button" aria-pressed={metric===key} onClick={()=>setMetric(key)}>{emoji} {tr(label)}</button>)}
  </nav>
  {error?<div role="alert" className="leaderboard-feedback">{error} <button type="button" onClick={()=>void load()}>Retry</button></div>:null}
  {loading?<p role="status" className="leaderboard-feedback">{tr("loadingRankings")}</p>:
   result?<section className="leaderboard-board" aria-label={METRICS[metric][1]+" rankings"}>
    <div className="leaderboard-section-title"><h2>{language==="es"?"Clasificación general":"Player rankings"}</h2><small>{tr("rankedPlayers",{count:format(result.total)})}</small></div>
    {!result.top?.length?<p className="leaderboard-empty">{tr("emptyRankings")}</p>:
     <table className="leaderboard-stat-grid"><thead><tr><th scope="col">{tr("rank")}</th><th scope="col">{tr("player")}</th>{Object.entries(METRICS).map(([key,[icon,label]])=><th key={key} scope="col" aria-sort={metric===key?"descending":"none"}>{icon} {tr(label)}</th>)}</tr></thead>
      <tbody>{result.top.map((r,i)=><tr key={r.username+"-"+i}><td className="leaderboard-rank">#{r.rank}</td><td className="leaderboard-player"><strong>{r.displayName||r.username}</strong><small>@{r.username}</small></td>{Object.entries(METRICS).map(([key,[icon,label]])=><td key={key} className={"leaderboard-score"+(metric===key?" is-selected":"")}><span className="leaderboard-mobile-label" aria-hidden="true">{icon} {tr(label)}</span><strong>{format(r.scores?.[key]??(metric===key?r.score:null))}</strong></td>)}</tr>)}</tbody></table>}
    {result.participating&&result.self?<div className="leaderboard-self" role="status"><strong>{tr("yourRank",{rank:result.self.rank})}</strong><div className="leaderboard-self-scores">{Object.entries(METRICS).map(([key,[icon,label]])=><span key={key}>{icon} {tr(label)} <b>{format(result.self.scores?.[key]??(key===metric?result.self.score:null))}</b></span>)}</div></div>:null}
   </section>:null}
 </div></div>;
}
export default function Leaderboard(){return <WebAccountGate><LeaderboardBody/></WebAccountGate>;}
