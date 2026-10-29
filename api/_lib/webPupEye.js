import {getClientIp} from './networkRisk.js';

// Server-only PupEye Web authorization. Browser sessions are NOT device attestations.
export class WebPupEyeError extends Error {
 constructor(status,code){super(code);this.status=status;this.code=code;}
}
export async function checkWebPupEye(db,accountUuid,action,headers,{vercel=false,now=Date.now()}={}) {
 if(!accountUuid || !['gameplay','profile','notifications','exchange','admin','gift'].includes(action))
  throw new WebPupEyeError(400,'PUPEYE_WEB_ACTION_INVALID');
 const ip=getClientIp(headers,vercel);
 if(ip){
  // IP is derived exclusively from the trusted Vercel request headers.
  // Never accept an IP submitted in JSON by a client.
  const {data,error}=await db.from('pup_web_ip_bans')
   .select('id,expires_at').eq('ip_address',ip).is('revoked_at',null)
   .or('expires_at.is.null,expires_at.gt.'+new Date(now).toISOString()).limit(1);
  if(error)throw new WebPupEyeError(503,'PUPEYE_WEB_ENFORCEMENT_UNAVAILABLE');
  if(data?.length)throw new WebPupEyeError(403,'PUPEYE_WEB_IP_BANNED');
 }
 const {data,error}=await db.rpc('pupeye_web_gate',{
  p_account_uuid:accountUuid,p_action:action
 });
 if(error)throw new WebPupEyeError(503,'PUPEYE_WEB_ENFORCEMENT_UNAVAILABLE');
 if(data!==true)throw new WebPupEyeError(429,'PUPEYE_WEB_RATE_LIMIT');
 return true;
}
