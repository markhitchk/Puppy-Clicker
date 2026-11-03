// Browser-only notification presentation state, scoped to the verified Pup Account.
// This never alters currency, claim status, signed rewards or the cloud save.
const PREFIX='puppy-clicker-notification-ui:v1:';
const MAX_IDS=500;
const safeId=value=>typeof value==='string'&&value.length>0&&value.length<=100;
const key=accountId=>{
 if(typeof accountId!=='string'||!/^[0-9a-f-]{36}$/i.test(accountId))return null;
 return PREFIX+accountId.toLowerCase();
};
const unique=values=>[...new Set((Array.isArray(values)?values:[]).filter(safeId))].slice(-MAX_IDS);
const initial=()=>({read:[],hidden:[]});
export function readNotificationUiState(accountId,storage=globalThis.localStorage){
 const k=key(accountId);
 if(!k||!storage)return initial();
 try{
  const data=JSON.parse(storage.getItem(k)||'null');
  if(!data||data.version!==1)return initial();
  return {read:unique(data.read),hidden:unique(data.hidden)};
 }catch{return initial();}
}
// Do not hide unclaimed AFK rewards. The claim button is a server-authorized
// transaction and its notification is the only route to collecting the payout.
const claimable=n=>n?.action==='afkClaim';
export function applyNotificationUiState(game,ui){
 const read=new Set(ui?.read||[]);
 const hidden=new Set(ui?.hidden||[]);
 return {...game,
  notificationInbox:(game.notificationInbox||[])
   .filter(n=>!hidden.has(n.id)||claimable(n))
   .map(n=>read.has(n.id)?{...n,read:true}:n),
  notificationSeenIds:unique([...(game.notificationSeenIds||[]),...hidden])
 };
}
export function saveNotificationUiAction(accountId,action,notifications,storage=globalThis.localStorage){
 const k=key(accountId);
 if(!k||!storage)return false;
 const ui=readNotificationUiState(accountId,storage);
 const read=new Set(ui.read),hidden=new Set(ui.hidden);
 const items=Array.isArray(notifications)?notifications:[];
 if(action?.type==='openNotification'){
  if(items.some(n=>n.id===action.id&&safeId(n.id)))read.add(action.id);
 }else if(action?.type==='markNotificationsRead'){
  for(const n of items)if(safeId(n.id))read.add(n.id);
 }else if(action?.type==='clearReadNotifications'){
  for(const n of items){
   if(safeId(n.id)&&(n.read===true||read.has(n.id))&&!claimable(n))hidden.add(n.id);
  }
 }else return true;
 try{
  storage.setItem(k,JSON.stringify({version:1,read:unique([...read]),hidden:unique([...hidden])}));
  return true;
 }catch{return false;}
}
