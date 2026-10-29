import React,{useState} from 'react';
import {describeDevice,formatTime,presentActivityEvent,sessionIsOnline} from './adminPresentation.js';

export default function AdminActivity({activity,filter,onFilter}){
 const [query,setQuery]=useState('');
 const search=query.trim().toLowerCase();
 const matches=(...values)=>values.some(v=>String(v||'').toLowerCase().includes(search));
 const sessions=(activity.sessions||[]).filter(s=>matches(s.accountName,s.ip_address,s.path,...Object.values(describeDevice(s.user_agent))));
 const events=(activity.events||[]).filter(e=>matches(e.accountName,e.login_hint,e.event_code,e.error_code,e.ip_address,presentActivityEvent(e).title));
 return <div className="pup-admin-activity">
  <section className="pup-admin-panel">
   <div className="pup-admin-section-heading"><div><h2>Website connections</h2><p className="pup-admin-note">Active means seen in the last 90 seconds. Presence refreshes every 30 seconds while a page is visible.</p></div>
    <input type="search" aria-label="Search activity and devices" placeholder="Search account, device or IP…" value={query} onChange={e=>setQuery(e.target.value)}/>
   </div>
   <div className="pup-admin-table-wrap"><table className="pup-admin-table">
    <thead><tr><th>Account</th><th>Device & browser</th><th>Connection</th><th>Page</th><th>Last seen</th></tr></thead>
    <tbody>{sessions.map(s=>{const device=describeDevice(s.user_agent);return <tr key={s.id}>
     <td><strong>{s.accountName||'Visitor'}</strong><small>{s.account_uuid?'Registered Pup Account':'Not signed in'}</small></td>
     <td><strong>{device.device}</strong><small>{device.browser}</small></td>
     <td><span className={'pup-admin-status '+(sessionIsOnline(s)?'':'neutral')}>{sessionIsOnline(s)?'Active now':'Offline'}</span><small>{s.ip_address||'IP unavailable'}</small></td>
     <td>{s.path}</td><td>{formatTime(s.last_seen_at)}</td>
    </tr>;})}</tbody></table></div>
   {!sessions.length?<p className="pup-admin-empty">No matching website connections recorded in the last 24 hours.</p>:null}
   <p className="pup-admin-note">Shows up to 150 recent browser sessions. Device names are inferred from the browser. Visitors appear here without creating Pup Accounts.</p>
  </section>
  <section className="pup-admin-panel">
   <div className="pup-admin-section-heading"><h2>Sign-ins, registrations & errors</h2>
    <label className="pup-admin-filter">Show<select aria-label="Activity filter" value={filter} onChange={e=>onFilter(e.target.value)}>
     <option value="all">All activity</option><option value="auth">Sign-ins & registrations</option>
     <option value="errors">Errors & failed attempts</option><option value="connections">Page connections</option>
    </select></label>
   </div>
   <div className="pup-admin-table-wrap"><table className="pup-admin-table">
    <thead><tr><th>When</th><th>Activity</th><th>Account</th><th>Details</th><th>Device</th></tr></thead>
    <tbody>{events.map(e=>{const view=presentActivityEvent(e),device=describeDevice(e.user_agent);return <tr key={e.id}>
     <td>{formatTime(e.created_at)}</td><td><strong>{view.title}</strong><small><span className={'pup-admin-status '+(e.outcome==='failure'?'danger':e.outcome==='info'?'neutral':'')}>{e.outcome==='failure'?'Failed':e.outcome==='success'?'Succeeded':'Info'}</span></small></td>
     <td>{view.account}</td><td><p className="pup-admin-detail">{view.description}</p><small>{e.source==='server'?'Verified by account server':'Reported by browser'}{e.error_code?' · '+e.error_code:''}</small></td>
     <td><strong>{device.device}</strong><small>{device.browser} · {e.ip_address||'IP unavailable'}</small></td>
    </tr>;})}</tbody></table></div>
   {!events.length?<p className="pup-admin-empty">No matching activity recorded in the last 24 hours.</p>:null}
   <p className="pup-admin-note">Up to 200 recent matching events. Recording begins with this update; earlier unrecorded failures cannot be recovered. Passwords, tokens, and raw exception contents are never stored.</p>
  </section>
  <section className="pup-admin-panel"><h2>Linked Android devices</h2>
   <p className="pup-admin-note">Existing devices linked to registered Pup Accounts. These records are read only; Android last-seen times do not establish an active website connection.</p>
   <div className="pup-admin-device-grid">{(activity.androidDevices||[]).filter(d=>matches(d.accountName,d.device_model,d.platform)).map(d=><article className="pup-admin-device" key={d.id}>
    <strong>{d.device_model||'Android device'}</strong><span>{d.accountName}</span>
    <small>{d.platform||'Android'}{d.app_version?' · App '+d.app_version:''}</small>
    <small>Last seen {formatTime(d.last_seen_at||d.linkedLastSeen)}</small>
    <span className={'pup-admin-status '+(d.active&&!d.revoked_at?'':'neutral')}>{d.active&&!d.revoked_at?'Linked':'Inactive'}</span>
   </article>)}</div>
   {!activity.androidDevices?.length?<p className="pup-admin-empty">No linked Android device records.</p>:null}
  </section>
 </div>;
}
