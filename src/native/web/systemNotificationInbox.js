// Read-only presentation of authenticated server notifications.
// This projection never enters the gameplay save or its server-side reducer.
export function mapSystemNotifications(notifications){
 if(!Array.isArray(notifications))return [];
 const seen=new Set();
 return notifications.filter(n=>
  n&&typeof n.id==="string"&&/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(n.id)&&
  !seen.has(n.id)&&seen.add(n.id)&&
  typeof n.title==="string"&&typeof n.body==="string"&&
  typeof n.createdAt==="string"&&Number.isFinite(Date.parse(n.createdAt))
 ).slice(0,100).map(n=>({
  id:"staff:"+n.id,category:"system",title:n.title.slice(0,180),
  body:n.body.slice(0,1000),createdAt:Date.parse(n.createdAt),
  read:n.read===true,action:null
 }));
}
export function combineNotificationInbox(game,serverInbox,accountId){
 const rows=serverInbox.accountId===accountId?serverInbox.rows:[];
 const other=(Array.isArray(game.notificationInbox)?game.notificationInbox:[])
  .filter(n=>!rows.some(s=>s.id===n.id));
 return {...game,notificationInbox:[...rows,...other]};
}
