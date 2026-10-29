export const formatTime=value=>{
 if(!value)return '—';
 const date=new Date(value);
 return Number.isNaN(date.getTime())?'—':date.toLocaleString();
};
export function sessionIsOnline(session,now=Date.now()){
 const seen=Date.parse(session.last_seen_at);
 return !session.ended_at&&Number.isFinite(seen)&&seen<=now+5000&&now-seen<90000;
}
export function describeDevice(userAgent=''){
 const ua=String(userAgent);
 const device=/Android/i.test(ua)?'Android phone or tablet':/iPad/i.test(ua)?'iPad':
  /iPhone/i.test(ua)?'iPhone':/CrOS/i.test(ua)?'Chromebook':/Windows/i.test(ua)?'Windows computer':
  /Macintosh|Mac OS X/i.test(ua)?'Mac':/Linux/i.test(ua)?'Linux computer':'Unknown device';
 const browser=/SamsungBrowser/i.test(ua)?'Samsung Internet':/Edg\//i.test(ua)?'Edge':
  /OPR\//i.test(ua)?'Opera':/Firefox|FxiOS/i.test(ua)?'Firefox':/Chrome|CriOS/i.test(ua)?'Chrome':
  /Safari/i.test(ua)?'Safari':'Unknown browser';
 return {device,browser};
}
const titles={
 WEB_CONSOLE_OPENED:'Staff console opened',WEB_USERS_VIEW:'Account directory viewed',
 WEB_BANS_VIEW:'Restriction history viewed',WEB_AUDIT_VIEW:'Audit log viewed',
 WEB_ROLE_CHANGED:'Account role changed',WEB_BAN_CREATED:'Account banned',
 WEB_SUSPENSION_CREATED:'Account suspended',WEB_BAN_REVOKED:'Restriction lifted',
 WEB_SYSTEM_PUPPY_GRANTED:'System puppy delivered',WEB_PUPPY_REQUEST_DECLINED:'Puppy request declined',
 WEB_PUPPY_REQUEST_CREATED:'Puppy requested',WEB_PROFILE_UPDATED:'Profile updated',
 login_success:'Sign-in succeeded',login_failed:'Sign-in failed',register_success:'Registration succeeded',
 register_failed:'Registration failed',discord_authorized:'Discord authorization completed',
 discord_registration_required:'Discord registration started',page_view:'Page visited',
 heartbeat:'Website connected',session_end:'Website disconnected',logout:'Signed out',
 client_error:'Browser error',auth_error:'Browser sign-in error',service_error:'Service request failed'
};
const humanize=value=>String(value||'Activity').replace(/_/g,' ').toLowerCase().replace(/^./,s=>s.toUpperCase());
export function friendlyError(code){
 return ({PUP_SIGNIN_INVALID:'Username or password was not accepted.',
 PUP_USERNAME_TAKEN:'That username is already registered.',PUP_USERNAME_INVALID:'The username format was not valid.',
 PUP_PASSWORD_COMPLEXITY_REQUIRED:'The password did not meet the account requirements.',
 PUP_LEGAL_ACCEPTANCE_REQUIRED:'Terms and privacy acceptance are required.',
 PUP_SIGNUP_RATE_LIMIT:'Too many registration attempts. Try again later.',
 PUP_ACCOUNT_BLOCKED:'This account has an active restriction.',
 PUP_DISCORD_SIGNUP_EXPIRED:'Discord registration expired.',DISCORD_LOGIN_CANCELLED:'Discord sign-in was cancelled.',
 PUP_ACCOUNT_LINK_REQUIRED:'The existing account needs to be linked through recovery.',
 BROWSER_RUNTIME_ERROR:'A page encountered a browser error.',
 BROWSER_UNHANDLED_ERROR:'A background browser request failed.',
 PUP_WEB_AUTH_UNAVAILABLE:'The account service was temporarily unavailable.'})[code]||humanize(code);
}
export function presentAuditEvent(event){
 const d=event.detail||{},parts=[];
 if(typeof d.reason==='string')parts.push(d.reason.slice(0,300));
 if(['WEB_BAN_CREATED','WEB_SUSPENSION_CREATED'].includes(event.action_code))
  parts.push(d.expiresAt?'Until '+formatTime(d.expiresAt):'Permanent');
 if(typeof d.before==='string'&&typeof d.after==='string')parts.push(humanize(d.before)+' → '+humanize(d.after));
 if(typeof d.puppyId==='string')parts.push('Puppy: '+humanize(d.puppyId));
 if(Number.isFinite(d.count))parts.push(d.count+' record'+(d.count===1?'':'s'));
 return {title:titles[event.action_code]||humanize(event.action_code),
  actor:event.actorName||'System or former staff',target:event.targetName||'—',
  description:parts.join(' · ')||'Staff activity recorded.'};
}
export function presentActivityEvent(event){
 const parts=[];
 if(event.provider)parts.push(event.provider==='discord'?'Discord':'Pup username');
 if(event.error_code)parts.push(friendlyError(event.error_code));
 if(event.path)parts.push(event.path);
 return {title:titles[event.event_code]||humanize(event.event_code),
  account:event.accountName||event.login_hint&&('@'+event.login_hint+' (attempted)')||'Visitor',
  description:parts.join(' · ')||'Website activity recorded.'};
}
