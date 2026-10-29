import React,{useCallback,useEffect,useState} from "react";
import {useWebAccount} from "./native/web/AccountGate.jsx";
import "./AdminPortal.css";
import AdminPuppyGifts from "./AdminPuppyGifts.jsx";
import AdminActivity from "./AdminActivity.jsx";
import AdminRestrictionDialog from "./AdminRestrictionDialog.jsx";
import {formatTime,describeDevice,presentAuditEvent,sessionIsOnline} from "./adminPresentation.js";

const initialSection=()=> {
 const match=globalThis.location?.pathname?.match(/^\/account\/admin\/(users|bans|audit|gifts|activity)\/?$/);
 return match?.[1] || "users";
};
const normalizeError=(code)=>{
 const errors={
  SIGN_IN_REQUIRED:"Sign in to your Pup Account to continue.",
  STAFF_ACCESS_REQUIRED:"You do not have access to the Puppy Clicker administration dashboard.",
  ACCOUNT_NOT_ACTIVE:"This account is not active.",
  PUP_ACCOUNT_REQUIRED:"Your session is not linked to a verified Pup Account.",
  ADMIN_BACKEND_NOT_CONFIGURED:"The administration server is not configured on Vercel.",
  ADMIN_DATA_UNAVAILABLE:"The administration service could not load its data.",
  LAST_DEVELOPER_PROTECTED:"The final active Developer cannot be demoted.",
  DEVELOPER_ROLE_PROTECTED:"Developer accounts must be demoted through a separate owner-reviewed workflow.",
  ACCOUNT_BANNED:"This account is banned from Puppy Clicker.",
  CANNOT_SANCTION_STAFF:"You cannot restrict this staff account or your own account.",
  SUSPENSION_EXPIRY_REQUIRED:"Choose when this suspension should end.",
  INVALID_BAN_EXPIRY:"Choose an end time in the future, within five years.",
  INVALID_BAN_REASON:"Enter a public reason between 3 and 300 characters.",
  CANNOT_UNBAN_STAFF:"Only a Developer can lift restrictions on staff.",
  DEVELOPER_ROLE_REQUIRED:"Only Developers can change staff roles.",
  REGISTERED_PUP_ACCOUNT_REQUIRED:"This player does not have a registered Pup Account.",
  MANAGE_FROM_ORIGINAL_SYSTEM:"This ban must be managed in the original PupEye support system.",
  ROLE_CHANGED_CONCURRENTLY:"This account's role was changed. Refresh and try again."
 };
 return errors[code] || (code?"Request failed: "+code:"The administration service is temporarily unavailable.");
};
function Stat({label,value}) {return <div className="pup-admin-stat"><span>{label}</span><strong>{value}</strong></div>;}

export default function AdminPortal(){
 const {client,pupAccount} = useWebAccount();
 const [section,setSection] = useState(initialSection);
 const [staff,setStaff] = useState(null);
 const [users,setUsers] = useState([]);
 const [bans,setBans] = useState([]);
 const [events,setEvents] = useState([]);
 const [query,setQuery] = useState("");
 const [busy,setBusy] = useState(false);
 const [message,setMessage] = useState("");
 const [error,setError] = useState("");
 const [ready,setReady] = useState(false);
 const [showRestriction,setShowRestriction] = useState(null);
 const [activity,setActivity] = useState({sessions:[],events:[],androidDevices:[],summary:{}});
 const [activityFilter,setActivityFilter] = useState('all');
 const [selectedRole,setSelectedRole] = useState({});
 const [tabLoading,setTabLoading] = useState(false);

 const request=useCallback(async(body)=>{
  const {data,error:sessionError} = await client.auth.getSession();
  const token=data?.session?.access_token;
  if(sessionError || !token)throw Error("SIGN_IN_REQUIRED");
  const response=await fetch("/api/admin",{
   method:"POST",headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},
   credentials:"same-origin",cache:"no-store",body:JSON.stringify(body)
  });
  let result;
  try{result=await response.json();}catch{throw Error("ADMIN_UNAVAILABLE");}
  if(!response.ok || result.ok!==true)throw Error(result.error || "ADMIN_UNAVAILABLE");
  return result;
 },[client]);

 const refresh=useCallback(async(tab,silent=false)=>{
  if(!['users','bans','audit','activity'].includes(tab))return;
  if(!silent){setTabLoading(true);setError("");}
  try {
   const result=await request({action:tab,filter:activityFilter});
   if(tab==="users")setUsers(result.users||[]);
   if(tab==="bans")setBans(result.bans||[]);
   if(tab==="audit")setEvents(result.events||[]);
   if(tab==="activity")setActivity(result);
  }catch(e){setError(normalizeError(e.message));}
  finally{if(!silent)setTabLoading(false);}
 },[request,activityFilter]);

 useEffect(()=>{
  let alive=true;
  request({action:"staff-info"}).then(info=>{
   if(!alive)return;
   setStaff(info);setReady(true);
  }).catch(e=>{
   if(!alive)return;
   setError(normalizeError(e.message));setReady(true);
  });
  return ()=>{alive=false;};
 },[request]);

 useEffect(()=>{
  if(!staff)return;
  void refresh(section);
  if(section!=='activity')void refresh('activity',true);
  const timer=setInterval(()=>{
   if(document.visibilityState==='hidden'||busy)return;
   void refresh(section,true);
   if(section!=='activity')void refresh('activity',true);
  },30000);
  return ()=>clearInterval(timer);
 },[staff,section,refresh,busy]);
 useEffect(()=>{
  if(!staff)return;
  if(section!=='users')void refresh('users',true);
  if(section!=='bans')void refresh('bans',true);
  if(section!=='audit')void refresh('audit',true);
 },[staff]);

 const navigate=(tab)=>{
  setSection(tab);setMessage("");setError("");
  const next="/account/admin/"+tab;
  if(globalThis.history?.replaceState)globalThis.history.replaceState(null,"",next);
 };
 const run=async(body,success)=>{
  if(busy)return;
  setBusy(true);setError("");setMessage("");
  try{
   await request(body);
   setMessage(success);
   setShowRestriction(null);
   await Promise.all([refresh("users",true),refresh("bans",true),refresh("audit",true)]);
  }catch(e){setError(normalizeError(e.message));}
  finally{setBusy(false);}
 };
 const restrictUser=body=>run(body,body.action==='suspend-account'?'Account suspended until the selected end time.':'Account ban created.');
 const liftRestriction=user=>{
  if(!window.confirm('Lift the current restriction on @'+user.username+'?'))return;
  void run({action:'unban-account',banId:user.restriction.id},'Restriction lifted.');
 };
 const confirmedRole=(user)=>{
  const next=selectedRole[user.id] || user.role;
  if(next===user.role)return;
  if(!window.confirm("Change "+user.username+"'s role to "+next+"?"))return;
  void run({action:"role-update",targetPlayerId:user.id,role:next},"Role updated.");
 };
 const revoke=(ban)=>{
  if(!window.confirm("Lift restriction "+(ban.public_ban_id||ban.id)+"?"))return;
  void run({action:"unban-account",banId:ban.id},"Restriction lifted.");
 };
 if(!ready)return <section className="pup-admin-container"><h1>🐾 Puppy Clicker Admin</h1><p>Verifying staff permissions…</p></section>;
 if(!staff)return <section className="pup-admin-container pup-admin-locked">
  <h1>🔒 Administration restricted</h1>
  <p role="alert">{error}</p>
  <a className="pup-admin-link" href="/account">Return to your Pup Account</a>
 </section>;
 const visibleUsers=users.filter(u=>
   [u.username,u.displayName,u.playerId,u.friendCode].some(v=>
     String(v||"").toLowerCase().includes(query.trim().toLowerCase())));
 const activeBans=bans.filter(b=>b.status==="active"&&!b.revoked_at&&
    (!b.expires_at || new Date(b.expires_at)>new Date())).length;
 return <div className="pup-admin-container">
  <header className="pup-admin-head">
   <div><p className="pup-admin-kicker">🐾 PUPPY CLICKER · STAFF CONSOLE</p>
    <h1>Administration</h1><p>Protect Pup Accounts, review activity, and manage player standing.</p>
   </div>
   <div className="pup-admin-identity"><span>{staff.role==="DEVELOPER"?"Developer":"Administrator"}</span>
    <strong>{staff.username||pupAccount.username}</strong>
    <a href="/account">← Account</a>
   </div>
  </header>
  <div className="pup-admin-stats">
   <Stat label="Registered Pup Accounts" value={users.length}/>
   <Stat label="Active restrictions" value={activeBans}/>
   <Stat label="Accounts online" value={activity.summary?.onlineAccounts??'—'}/>
   <Stat label="Browser sessions online" value={activity.summary?.onlineSessions??'—'}/>
   <Stat label="Errors in 24 hours" value={activity.summary?.errors24h??'—'}/>
  </div>
  <nav className="pup-admin-tabs" aria-label="Administration sections">
   {[["users","👥 Users"],["bans","🛡️ Restrictions"],["activity","🖥️ Activity & Devices"],["audit","📋 Audit Log"],["gifts","🎁 Gifts & Requests"]].map(([tab,label])=>
    <button key={tab} type="button" className={section===tab?"is-selected":""}
     aria-current={section===tab?"page":undefined} onClick={()=>navigate(tab)}>{label}</button>)}
   <button type="button" className="pup-admin-refresh" onClick={()=>void refresh(section)} disabled={busy||tabLoading||section==="gifts"}>↻ Refresh</button>
  </nav>
  {error?<p className="pup-admin-error" role="alert">{error}</p>:null}
  {message?<p className="pup-admin-success" role="status">{message}</p>:null}
  {tabLoading?<p className="pup-admin-loading" role="status">Loading {section}…</p>:null}
  {section==="users"?<section className="pup-admin-panel" aria-label="Player management">
   <div className="pup-admin-section-heading"><h2>Registered Pup Accounts</h2>
    <input aria-label="Search users" placeholder="Search username, player ID or friend code…"
      value={query} onChange={e=>setQuery(e.target.value)} type="search" />
   </div>
   <p className="pup-admin-note">Registered Pup Accounts only. Manage access and review the latest website connection. Saved progress and Android installation records are preserved.</p>
   <div className="pup-admin-table-wrap"><table className="pup-admin-table">
    <thead><tr><th>Player</th><th>Standing</th><th>Role</th><th>Latest connection</th><th>Actions</th></tr></thead>
    <tbody>{visibleUsers.map(user=>
     <tr key={user.id}>
      <td><strong>{user.displayName||user.username}</strong><small>@{user.username}</small><small>{user.friendCode||"—"}</small>{user.contactEmail?<small>Support email: {user.contactEmail}</small>:null}</td>
      <td><span className={'pup-admin-status '+(user.status==='active'?'':'danger')}>{user.status||'unknown'}</span>
       {user.restriction?<><small>{user.restriction.reason}</small><small>{user.restriction.expiresAt?'Until '+formatTime(user.restriction.expiresAt):'Permanent'}</small></>:null}</td>
      <td>{staff.role==="DEVELOPER" && user.role!=="DEVELOPER"?
       <div className="pup-admin-role"><select aria-label={"Role for "+user.username}
       value={selectedRole[user.id]||user.role} onChange={e=>setSelectedRole(prev=>({...prev,[user.id]:e.target.value}))}>
       <option value="GUEST">Guest</option><option value="PUP_MEMBER">Pup Member</option>
       <option value="ADMIN">Admin</option><option value="DEVELOPER">Developer</option>
       </select><button type="button" disabled={busy||!selectedRole[user.id]||selectedRole[user.id]===user.role}
       onClick={()=>confirmedRole(user)}>Save</button></div>:user.role}</td>
      <td>{user.network?<><strong>{describeDevice(user.network.userAgent).device}</strong>
       <small>{describeDevice(user.network.userAgent).browser} · {user.network.ip||'IP unavailable'}</small>
       <small>{sessionIsOnline(user.network)?'Active now · ':''}{formatTime(user.network.checkedAt)}</small>
       {user.network.vpn!==null?<small>VPN {user.network.vpn?'detected':'not detected'}</small>:null}</>:
       <small>No website connection recorded yet</small>}</td>
      <td><div className="pup-admin-row-actions">
       <button type="button" disabled={busy||user.id===staff.playerUuid||staff.role==='ADMIN'&&['ADMIN','DEVELOPER'].includes(user.role)}
        onClick={()=>setShowRestriction({user,type:'suspension'})}>Suspend</button>
       <button type="button" className="pup-admin-danger-button" disabled={busy||user.id===staff.playerUuid||staff.role==='ADMIN'&&['ADMIN','DEVELOPER'].includes(user.role)}
        onClick={()=>setShowRestriction({user,type:'ban'})}>Ban account</button>
       {user.restriction?.managedHere?<button type="button" disabled={busy||user.id===staff.playerUuid||staff.role==='ADMIN'&&['ADMIN','DEVELOPER'].includes(user.role)}
        onClick={()=>liftRestriction(user)}>Lift restriction</button>:null}
      </div></td>
     </tr>)}
    </tbody></table></div>
   {!visibleUsers.length&&!tabLoading?<p className="pup-admin-empty">No matching Pup Accounts.</p>:null}
   <p className="pup-admin-note">Up to 100 registered accounts. Open Activity & Devices for website sessions, linked Android devices, sign-ins and errors.</p>
  </section>:null}
  {section==="activity"?<AdminActivity activity={activity} filter={activityFilter} onFilter={setActivityFilter}/>:null}
  {section==="gifts"?<AdminPuppyGifts request={request} role={staff.role}/>:null}
  {section==="bans"?<section className="pup-admin-panel">
   <h2>Suspension & ban history</h2><p className="pup-admin-note">Restrictions apply to Android and the website. Timed restrictions stop applying at their end time. Bans issued outside this panel must be managed by their original system.</p>
   <div className="pup-admin-table-wrap"><table className="pup-admin-table">
    <thead><tr><th>Ban ID</th><th>Target</th><th>Type & reason</th><th>Ends</th><th>Status</th><th>Action</th></tr></thead>
    <tbody>{bans.map(b=><tr key={b.id}>
     <td><strong>{b.public_ban_id||b.id}</strong><small>{formatTime(b.issued_at)}</small></td>
     <td>{b.targets?.map(t=>t.name||t.targetType).join(", ")||"—"}</td>
     <td><strong>{b.reason_code==="WEB_ADMIN_SUSPENSION"?"Suspension":"Ban"}</strong><small>{b.public_reason||"Not provided"}</small></td>
     <td>{b.kind==="permanent"?"Permanent":formatTime(b.expires_at)}</td>
     <td><span className={b.status==="active"?"pup-admin-status danger":"pup-admin-status"}>{b.status}</span></td>
     <td>{b.status==="active"&&String(b.issued_by||"").startsWith("web_admin:")?
      <button type="button" disabled={busy} onClick={()=>revoke(b)}>Lift restriction</button>:<small>{b.status==="active"?"Managed externally":"—"}</small>}</td>
    </tr>)}</tbody></table></div>
   {!bans.length?<p className="pup-admin-empty">No restrictions found.</p>:null}
  </section>:null}
  {section==="audit"?<section className="pup-admin-panel">
   <h2>Staff audit log</h2><p className="pup-admin-note">Readable records of account and moderation changes. Sign-ins, registrations, and errors appear in Activity & Devices.</p>
   <div className="pup-admin-table-wrap"><table className="pup-admin-table">
    <thead><tr><th>When</th><th>Action</th><th>Staff member</th><th>Account</th><th>Details</th></tr></thead>
    <tbody>{events.map(e=>{const view=presentAuditEvent(e);return <tr key={e.id}>
     <td>{formatTime(e.created_at)}</td><td><strong>{view.title}</strong></td>
     <td>{view.actor}</td><td>{view.target}</td><td><p className="pup-admin-detail">{view.description}</p></td>
    </tr>;})}</tbody></table></div>
   {!events.length?<p className="pup-admin-empty">No audit records found.</p>:null}
  </section>:null}
  {showRestriction?<AdminRestrictionDialog key={showRestriction.user.id+showRestriction.type}
   user={showRestriction.user} type={showRestriction.type} busy={busy}
   onClose={()=>setShowRestriction(null)} onSubmit={restrictUser}/>:null}
 </div>;
}
