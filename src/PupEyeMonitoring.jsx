import React from 'react';
import {formatTime} from './adminPresentation.js';
function Metric({label,value}){return <div className="pup-admin-stat"><span>{label}</span><strong>{Number.isFinite(value)?value.toLocaleString():'—'}</strong></div>}
const labels={gameplay:'Gameplay',profile:'Profile',notifications:'Notifications',exchange:'Exchange',admin:'Admin',gift:'Gifts',RATE_LIMIT:'Rate limit',IP_BAN_BLOCK:'IP restriction',NETWORK_RISK:'Network risk',REQUEST_BLOCKED:'Blocked request',advisory:'Advisory',warning:'Warning',high:'High',restriction:'Temporary restriction'};
function Breakdown({title,counts,keys}){
 const entries=keys?keys.map(k=>[k,counts?.[k]??0]):Object.entries(counts||{});
 return <section className="pup-monitoring-breakdown"><h4>{title}</h4>{entries.length?<dl>{entries.map(([key,value])=><div key={key}><dt>{labels[key]||key.replaceAll('_',' ')}</dt><dd>{Number.isFinite(value)?value.toLocaleString():'—'}</dd></div>)}</dl>:<p className="pup-admin-note">No observations in this window.</p>}</section>
}
export default function PupEyeMonitoring({data,unavailable=false}){
 if(!data)return <section className="pup-monitoring-overview" aria-label="PupEye monitoring overview"><h3>Monitoring overview</h3><p role="status">{unavailable?'Monitoring summary unavailable. Case history remains separate.':'Loading monitoring summary…'}</p></section>;
 const total=data.activeAccounts,observed=data.observedAccounts24h;
 const missing=Number.isFinite(total)&&Number.isFinite(observed)?Math.max(0,total-observed):null;
 return <section className="pup-monitoring-overview" aria-label="PupEye monitoring overview">
  <div className="pup-admin-section-heading"><div><h3>Monitoring overview · all accounts</h3><p className="pup-admin-note">Rolling 24-hour coverage across signed-in web traffic, fair-play observations and linked Android activity. Sources may overlap.</p></div><small role="status">{unavailable?'Last available snapshot · refresh failed':'Updated '+formatTime(data.generatedAt)}</small></div>
  <div className="pup-admin-stats">
   <Metric label="Active Pup Accounts" value={total}/><Metric label="Observed accounts · 24h" value={observed}/><Metric label="No recent observation" value={missing}/>
   <Metric label="Web rate-gated accounts · 24h" value={data.webAccounts24h}/><Metric label="Fair-play accounts · 24h" value={data.fairplayAccounts24h}/><Metric label="Linked Android accounts · 24h" value={data.androidAccounts24h}/>
   <Metric label="Retained fair-play profiles" value={data.retainedFairplayProfiles}/><Metric label="Open investigations" value={data.openCases}/><Metric label="Current temporary tap holds" value={data.activeTapHolds}/>
  </div>
  <p className="pup-admin-note">Last web request bucket: {data.lastWebRequest?formatTime(data.lastWebRequest):'Not observed'} · Last fair-play observation: {data.lastFairplayObservation?formatTime(data.lastFairplayObservation):'Not observed'}. No recent observations does not mean cheating or that monitoring is disabled.</p>
  <div className="pup-monitoring-grid">
   <Breakdown title="Server request counts · 24h" counts={data.requestsByAction} keys={['gameplay','profile','notifications','exchange','admin','gift']}/>
   <Breakdown title="Web security incidents · 24h" counts={data.incidentsByType} keys={['RATE_LIMIT','IP_BAN_BLOCK','NETWORK_RISK','REQUEST_BLOCKED']}/>
   <Breakdown title="Fair-play cases · 24h" counts={data.casesBySeverity} keys={['advisory','warning','high','restriction']}/>
   <Breakdown title="Recently seen Android devices · integrity state" counts={data.androidIntegrityStates}/>
  </div>
  <p className="pup-admin-note">Server rate and gameplay checks apply on authenticated actions. Browser timing is advisory only; Android integrity state is a recorded device signal, not proof of cheating. No automatic account bans are added by this dashboard.</p>
 </section>;
}
