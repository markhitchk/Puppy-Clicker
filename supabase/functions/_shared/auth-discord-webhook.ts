import {isIP} from 'node:net';
// Discord webhook that receives Puppy Clicker authentication notifications.
// Hardcoded by request. This module only runs inside Supabase Edge Functions,
// so the URL is never shipped in the website or Android client bundles.
export const AUTH_DISCORD_WEBHOOK_URL='https://discord.com/api/webhooks/1575733479474335864/AFdzdWEXEyTe2o_vvkTNyOUMnxPU_goPp9B8LQ1n8pOifPwFwK1ZZCVxvar-AmLFwKxW';
export type AuthNotification={
 event:'registration'|'login';
 status:'success'|'failure';
 username:string|null;
 provider:'password'|'discord'|null;
 ip:string|null;
 timestamp:string;
 reason?:string|null;
};
const AUTH_ACTIONS=new Set(['register','discord-register','password-login','discord-exchange']);
const USERNAME=/^[A-Za-z0-9_-]{3,20}$/;
const ERROR_CODE=/^[A-Z][A-Z0-9_]{2,79}$/;
export function clientIp(req:Request){
 for(const header of ['x-forwarded-for','x-real-ip','cf-connecting-ip']){
  const candidate=(req.headers.get(header)||'').split(',')[0].trim();
  if(isIP(candidate))return candidate;
 }
 return null;
}
// Maps a validated auth request/response pair to a notification, or null for
// anything that is not a registration, a successful login or a failed login.
export function authNotificationFor(action:unknown,status:number,payload:any,username:string|null,
 ip:string|null,timestamp=new Date().toISOString()):AuthNotification|null{
 if(typeof action!=='string'||!AUTH_ACTIONS.has(action))return null;
 const failed=status>=400||!!payload?.error;
 const provider=action.startsWith('discord')?'discord':'password';
 const base={username:username&&USERNAME.test(username)?username:null,provider,ip,timestamp} as const;
 if(action==='register'||action==='discord-register')
  return failed?null:{...base,event:'registration',status:'success'};
 if(failed)return {...base,event:'login',status:'failure',
  reason:ERROR_CODE.test(payload?.error||'')?payload.error:'PUP_WEB_AUTH_UNAVAILABLE'};
 // A Discord exchange that still needs a Pup Account is not a login yet.
 if(action==='discord-exchange'&&payload?.registration_required)return null;
 return {...base,event:'login',status:'success'};
}
export function discordPayload(n:AuthNotification){
 const title=n.event==='registration'?'New registration':
  n.status==='success'?'Successful login':'Failed login attempt';
 const fields=[
  {name:'Event',value:n.event,inline:true},
  {name:'Status',value:n.status,inline:true},
  {name:n.status==='failure'?'Attempted username':'Username',value:n.username||'Unknown',inline:true},
  {name:'Method',value:n.provider||'Unknown',inline:true},
  {name:'IP address',value:n.ip||'Unknown',inline:true},
  {name:'Time (UTC)',value:n.timestamp,inline:false}
 ];
 if(n.reason)fields.push({name:'Reason',value:n.reason,inline:false});
 return {
  username:'Puppy Clicker Auth',
  allowed_mentions:{parse:[]},
  embeds:[{title,color:n.status==='success'?0x22C55E:0xEF4444,fields,timestamp:n.timestamp,
   footer:{text:'Puppy Clicker authentication'}}]
 };
}
// Posts one notification. Never throws: webhook problems are logged and ignored.
export async function notifyAuthEvent(n:AuthNotification,
 {fetchImpl=fetch,webhookUrl=AUTH_DISCORD_WEBHOOK_URL,timeoutMs=3000}:{fetchImpl?:typeof fetch,webhookUrl?:string,timeoutMs?:number}={}){
 try{
  const result=await fetchImpl(webhookUrl,{method:'POST',headers:{'content-type':'application/json'},
   body:JSON.stringify(discordPayload(n)),signal:AbortSignal.timeout(timeoutMs)});
  if(!result.ok)console.error('Puppy auth Discord notification failed with status '+result.status);
 }catch(e){console.error('Puppy auth Discord notification unavailable: '+((e as Error)?.name||'error'));}
}
// Lets the Edge runtime finish background work after the response is sent.
function runInBackground(task:Promise<unknown>){
 try{(globalThis as any).EdgeRuntime?.waitUntil?.(task);}catch{/* Unsupported runtime. */}
}
// Reads only the auth action and identifier, then sends the webhook in the
// background so the auth response is never delayed or changed by Discord.
export async function notifyAuthResponse(req:Request,response:Response,db:any,context:any={},
 options:{fetchImpl?:typeof fetch,webhookUrl?:string,timeoutMs?:number}={}){
 try{
  const body=await req.json();
  if(!AUTH_ACTIONS.has(body?.action))return null;
  const payload=await response.clone().json().catch(()=>({}));
  const claimed=body.action==='password-login'?body.login:
   ['register','discord-register'].includes(body.action)?body.username:null;
  const n=authNotificationFor(body.action,response.status,payload,typeof claimed==='string'?claimed:null,clientIp(req));
  if(!n)return null;
  const task=(async()=>{
   // Discord logins carry no username in the request; use the verified account.
   if(!n.username&&n.status==='success'&&context.accountUuid){
    try{
     const {data}=await db.from('pup_accounts').select('username').eq('id',context.accountUuid).maybeSingle();
     if(typeof data?.username==='string'&&USERNAME.test(data.username))n.username=data.username;
    }catch{/* Username lookup is optional. */}
   }
   await notifyAuthEvent(n,options);
  })();
  runInBackground(task);
  // Wrapped so awaiting this function never waits for the webhook itself.
  return {task};
 }catch{
  console.error('Puppy auth Discord notification skipped');
  return null;
 }
}
