import {dbClient,ensure,validateRequest,fail} from './_lib/pupIdentity.js';
import {getClientIp} from './_lib/networkRisk.js';
import {findActiveIpBan} from './_lib/ipBan.js';
import {PupError} from './_lib/pupIdentity.js';
import {normalizeBrowserEvent,activityIdentity} from './_lib/webActivity.js';
export default async function handler(req,res){
 try{
  validateRequest(req,res);
  const event=normalizeBrowserEvent(req.body),db=dbClient();
  if(await findActiveIpBan(db,req.headers))throw new PupError(403,"IP_BANNED");
  const identity=await activityIdentity(req,db);
  const recorded=ensure(await db.rpc('record_pup_web_activity',{
   p_session_id:event.sessionId,p_account_uuid:identity.accountUuid,p_auth_user_id:identity.authUserId,
   p_event_code:event.event,p_source:'browser',p_outcome:event.errorCode?'failure':'info',
   p_path:event.path,p_ip:getClientIp(req.headers,process.env.VERCEL==='1'),
   p_user_agent:String(req.headers['user-agent']||'').slice(0,1024),
   p_error_code:event.errorCode,p_provider:event.provider,p_login_hint:null
  }));
  return res.status(200).json({ok:true,recorded:recorded===true});
 }catch(error){return fail(res,error);}
}
