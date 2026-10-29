import React,{useCallback,useEffect,useState} from "react";
import {useWebAccount} from "./native/web/AccountGate.jsx";
import "./AdminPortal.css";
import AdminPuppyGifts from "./AdminPuppyGifts.jsx";

const initialSection=()=> {
 const match=globalThis.location?.pathname?.match(/^\/account\/admin\/(users|bans|audit|gifts)\/?$/);
 return match?.[1] || "users";
};
const formatTime=value=>{
 if(!value)return "—";
 const date=new Date(value);
 return Number.isNaN(date.getTime())?"—":date.toLocaleString();
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
  CANNOT_SANCTION_STAFF:"You cannot ban this staff account.",
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
 const [showBan,setShowBan] = useState(null);
 const [reason,setReason] = useState("");
 const [expiry,setExpiry] = useState("");
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

 const refresh=useCallback(async(tab)=>{
  setTabLoading(true);setError("");
  try {
   const result=await request({action:tab==="users"?"users":tab==="bans"?"bans":"audit"});
   if(tab==="users")setUsers(result.users||[]);
   if(tab==="bans")setBans(result.bans||[]);
   if(tab==="audit")setEvents(result.events||[]);
  }catch(e){setError(normalizeError(e.message));}
  finally{setTabLoading(false);}
 },[request]);

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

 useEffect(()=>{if(staff&&section!=="gifts")void refresh(section);},[staff,section,refresh]);

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
   setShowBan(null);setReason("");setExpiry("");
   await Promise.all([refresh("users"),refresh("bans"),refresh("audit")]);
  }catch(e){setError(normalizeError(e.message));}
  finally{setBusy(false);}
 };
 const banUser=async(e)=>{
  e.preventDefault();
  if(!showBan)return;
  await run({action:"ban-account",targetPlayerId:showBan.id,
   reason:reason.trim(),expiresAt:expiry ? new Date(expiry).toISOString():null},
  "Account ban has been created. Active sessions are subject to backend enforcement.");
 };
 const confirmedRole=(user)=>{
  const next=selectedRole[user.id] || user.role;
  if(next===user.role)return;
  if(!window.confirm("Change "+user.username+"'s role to "+next+"?"))return;
  void run({action:"role-update",targetPlayerId:user.id,role:next},"Role updated.");
 };
 const revoke=(ban)=>{
  if(!window.confirm("Revoke ban "+(ban.public_ban_id||ban.id)+"?"))return;
  void run({action:"unban-account",banId:ban.id},"Ban revoked.");
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
   <Stat label="Active bans in history" value={activeBans}/>
   <Stat label="Recent audit events" value={events.length}/>
  </div>
  <nav className="pup-admin-tabs" aria-label="Administration sections">
   {[["users","👥 Users"],["bans","🛡️ Bans"],["audit","📋 Audit Log"],["gifts","🎁 Gifts & Requests"]].map(([tab,label])=>
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
   <p className="pup-admin-note">Only registered Pup Accounts appear here. Local Android/PupEye installation identities are not accounts and are excluded. No installation or save records are changed.</p>
   <div className="pup-admin-table-wrap"><table className="pup-admin-table">
    <thead><tr><th>Player</th><th>Standing</th><th>Role</th><th>Latest connection</th><th>Actions</th></tr></thead>
    <tbody>{visibleUsers.map(user=>
     <tr key={user.id}>
      <td><strong>{user.displayName||user.username}</strong><small>@{user.username}</small><small>{user.friendCode||"—"}</small>{user.contactEmail?<small>Support email: {user.contactEmail}</small>:null}</td>
      <td><span className={user.status==="blocked"?"pup-admin-status danger":"pup-admin-status"}>{user.status||"unknown"}</span></td>
      <td>{staff.role==="DEVELOPER" && user.role!=="DEVELOPER"?
       <div className="pup-admin-role"><select aria-label={"Role for "+user.username}
       value={selectedRole[user.id]||user.role} onChange={e=>setSelectedRole(prev=>({...prev,[user.id]:e.target.value}))}>
       <option value="GUEST">Guest</option><option value="PUP_MEMBER">Pup Member</option>
       <option value="ADMIN">Admin</option><option value="DEVELOPER">Developer</option>
       </select><button type="button" disabled={busy||!selectedRole[user.id]||selectedRole[user.id]===user.role}
       onClick={()=>confirmedRole(user)}>Save</button></div>:user.role}</td>
      <td>{user.connection?<><small><strong>{user.connection.recentlyActive?"Active recently":"Last seen"}:</strong> {formatTime(user.connection.lastSeenAt)}</small>
        <small><strong>Page:</strong> {user.connection.path||"/"}</small>
        <small><strong>IP:</strong> {user.connection.ip||"Not available"}</small>
        <small title={user.connection.userAgent}><strong>Browser:</strong> {user.connection.userAgent||"Not available"}</small>
        {user.network?<small>VPN: {user.network.vpn===null?"Unknown":user.network.vpn?"Detected":"Not detected"}</small>:null}</>:
        user.network?<><small><strong>Last network check:</strong> {formatTime(user.network.checkedAt)}</small>
          <small><strong>IP:</strong> {user.network.ip}</small>
          <small title={user.network.userAgent}><strong>Browser:</strong> {user.network.userAgent}</small></>:
        <small>No website visit recorded yet</small>}</td>
      <td><button type="button" className="pup-admin-danger-button"
        disabled={busy||user.id===staff.playerUuid||user.role==="DEVELOPER"||staff.role==="ADMIN"&&user.role==="ADMIN"}
        onClick={()=>{setShowBan(user);setReason("");setExpiry("");}}>Ban account</button></td>
     </tr>)}
    </tbody></table></div>
   {!visibleUsers.length&&!tabLoading?<p className="pup-admin-empty">No matching Pup Accounts.</p>:null}
   <p className="pup-admin-note">Directory shows up to 100 registered Pup Accounts. Verified website visits appear after a user signs in or returns to the site. VPN checks are optional. Access is restricted to staff and audited.</p>
  </section>:null}
  {section==="gifts"?<AdminPuppyGifts request={request} role={staff.role}/>:null}
  {section==="bans"?<section className="pup-admin-panel">
   <h2>Ban history</h2><p className="pup-admin-note">Shared PupEye bans affect Android and the website. Bans issued outside this panel must be managed by their original system.</p>
   <div className="pup-admin-table-wrap"><table className="pup-admin-table">
    <thead><tr><th>Ban ID</th><th>Target</th><th>Reason</th><th>Duration</th><th>Status</th><th>Action</th></tr></thead>
    <tbody>{bans.map(b=><tr key={b.id}>
     <td><strong>{b.public_ban_id||b.id}</strong><small>{formatTime(b.issued_at)}</small></td>
     <td>{b.targets?.map(t=>t.playerId||t.targetType).join(", ")||"—"}</td>
     <td>{b.public_reason||"Not provided"}</td>
     <td>{b.kind==="permanent"?"Permanent":formatTime(b.expires_at)}</td>
     <td><span className={b.status==="active"?"pup-admin-status danger":"pup-admin-status"}>{b.status}</span></td>
     <td>{b.status==="active"&&String(b.issued_by||"").startsWith("web_admin:")?
      <button type="button" disabled={busy} onClick={()=>revoke(b)}>Unban</button>:<small>Managed externally</small>}</td>
    </tr>)}</tbody></table></div>
   {!bans.length?<p className="pup-admin-empty">No bans found.</p>:null}
  </section>:null}
  {section==="audit"?<section className="pup-admin-panel">
   <h2>Admin audit log</h2><p className="pup-admin-note">Existing PupEye administration events plus changes made through the new website panel. Login and registration auditing needs the separate authentication integration.</p>
   <div className="pup-admin-table-wrap"><table className="pup-admin-table">
    <thead><tr><th>Timestamp</th><th>Event</th><th>Actor ID</th><th>Target ID</th><th>Details</th></tr></thead>
    <tbody>{events.map(e=><tr key={e.id}>
     <td>{formatTime(e.created_at)}</td><td><strong>{e.action_code}</strong></td>
     <td><small>{e.actor_player_uuid||"—"}</small></td>
     <td><small>{e.target_player_uuid||"—"}</small></td>
     <td><code>{JSON.stringify(e.detail||{}).slice(0,350)}</code></td>
    </tr>)}</tbody></table></div>
   {!events.length?<p className="pup-admin-empty">No audit records found.</p>:null}
  </section>:null}
  {showBan?<div className="pup-admin-modal-backdrop" role="presentation">
   <div className="pup-admin-modal" role="dialog" aria-modal="true" aria-label={"Ban "+showBan.username}>
    <h2>Ban @{showBan.username}</h2>
    <p>This is a registered Pup Account. The player ban is enforced on web and Android.</p>
    <form onSubmit={banUser}>
     <label>Reason<textarea required minLength={3} maxLength={300} value={reason}
       placeholder="Public explanation shown to the player…" onChange={e=>setReason(e.target.value)}/></label>
     <label>Expires at (optional)<input type="datetime-local" value={expiry}
       onChange={e=>setExpiry(e.target.value)}/></label>
     <p className="pup-admin-note">Leave the expiration blank for a permanent ban.</p>
     <div className="pup-admin-modal-actions">
      <button type="button" onClick={()=>setShowBan(null)} disabled={busy}>Cancel</button>
      <button type="submit" className="pup-admin-danger-button" disabled={busy||reason.trim().length<3}>{busy?"Saving…":"Confirm ban"}</button>
     </div>
    </form>
   </div>
  </div>:null}
 </div>;
}
