// Adapt authenticated server-side Pup Account notifications for the shared
// website inbox. Never trust an arbitrary player ID from the browser.
import {INBOX_LIMIT} from '../engine/inbox.js';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PREFIX='system:';
export const isSystemNotificationId=id=>typeof id==='string'&&
 id.startsWith(PREFIX)&&UUID.test(id.slice(PREFIX.length));
export function systemNotificationUuid(id){
 return isSystemNotificationId(id)?id.slice(PREFIX.length):null;
}
export function normalizeSystemNotifications(rows){
 if(!Array.isArray(rows))return [];
 const seen=new Set(),result=[];
 for(const row of rows.slice(0,INBOX_LIMIT)){
  if(!row||typeof row.id!=='string'||!UUID.test(row.id))continue;
  const id=PREFIX+row.id.toLowerCase();
  if(seen.has(id))continue;
  const createdAt=Date.parse(row.createdAt);
  if(!Number.isSafeInteger(createdAt)||createdAt<=0)continue;
  seen.add(id);
  result.push({
   id,category:row.kind==='developer'||row.kind==='item_grant'?'pup':'system',
   title:String(row.title||'Puppy Clicker system notification').slice(0,180),
   body:String(row.body||'').slice(0,1000),
   createdAt,read:row.read===true,action:null
  });
 }
 return result.sort((a,b)=>b.createdAt-a.createdAt);
}
export function mergeSystemNotifications(game,serverRows){
 const local=(Array.isArray(game.notificationInbox)?game.notificationInbox:[])
  .filter(n=>!isSystemNotificationId(n.id));
 const remote=Array.isArray(serverRows)?serverRows:[];
 const byId=new Map();
 for(const notice of [...local,...remote]){
  if(notice&&typeof notice.id==='string')byId.set(notice.id,notice);
 }
 return {...game,notificationInbox:[...byId.values()]
  .sort((a,b)=>b.createdAt-a.createdAt).slice(0,INBOX_LIMIT)};
}
export function systemNotificationMarkAction(action){
 if(action?.type==='openNotification'){
  const id=systemNotificationUuid(action.id);
  return id?{action:'notifications-mark',mode:'read-one',id}:null;
 }
 if(action?.type==='markNotificationsRead')
  return {action:'notifications-mark',mode:'read-all'};
 if(action?.type==='clearReadNotifications')
  return {action:'notifications-mark',mode:'clear-read'};
 return null;
}
