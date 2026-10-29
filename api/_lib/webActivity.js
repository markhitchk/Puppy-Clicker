import {PupError,ensure} from './pupIdentity.js';
import {UUID_PATTERN} from './adminPolicy.js';
const BROWSER_EVENTS=new Set(['page_view','heartbeat','session_end','logout','client_error','auth_error']);
export function safeActivityPath(value){
 const path=typeof value==='string'?value.split(/[?#]/)[0]: '/';
 return /^\/(?:play|account(?:\/admin(?:\/(?:users|bans|audit|gifts|activity))?)?|register|recovery|puppies|auth\/discord\/callback)?\/?$/.test(path)?path:'/other';
}
export function normalizeBrowserEvent(body){
 if(!BROWSER_EVENTS.has(body?.event))throw new PupError(400,'INVALID_ACTIVITY_EVENT');
 if(typeof body.sessionId!=='string'||!UUID_PATTERN.test(body.sessionId))throw new PupError(400,'INVALID_ACTIVITY_SESSION');
 return {sessionId:body.sessionId,event:body.event,path:safeActivityPath(body.path),
  errorCode:/^[A-Z][A-Z0-9_]{2,79}$/.test(body.errorCode||'')?body.errorCode:null,
  provider:['discord','password'].includes(body.provider)?body.provider:null};
}
export async function activityIdentity(req,db){
 const header=String(req.headers.authorization||'');
 if(!/^Bearer\s+\S+$/.test(header)||header.length>5000)return {accountUuid:null,authUserId:null};
 const {data,error}=await db.auth.getUser(header.replace(/^Bearer\s+/,''));
 if(error||!data?.user)return {accountUuid:null,authUserId:null};
 const link=ensure(await db.from('pup_web_auth_links').select('account_uuid').eq('auth_user_id',data.user.id).maybeSingle());
 return {accountUuid:link?.account_uuid||null,authUserId:link?data.user.id:null};
}
