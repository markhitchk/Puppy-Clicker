import {dbClient,validateRequest,PupError,fail} from './_lib/pupIdentity.js';
import {normalizePrivacyRequest,publicRequestRows,privacyRequestsAllowed} from './_lib/privacyPolicy.js';

// Account-scoped rights access remains possible even if gameplay is banned.
// Browser requests never choose an account, Player ID, or ownership identifier.
async function getPrivacyIdentity(req,db){
 const header=String(req.headers.authorization||'');
 if(!/^Bearer\s+\S+$/.test(header)||header.length>5000)throw new PupError(401,'PRIVACY_AUTH_REQUIRED');
 const {data,error}=await db.auth.getUser(header.replace(/^Bearer\s+/,''));
 if(error||!data?.user?.id)throw new PupError(401,'PRIVACY_AUTH_REQUIRED');
 const uid=data.user.id;
 const {data:link,error:linkError}=await db.from('pup_web_auth_links').select('account_uuid').eq('auth_user_id',uid).maybeSingle();
 if(linkError)throw new PupError(503,'PRIVACY_UNAVAILABLE');
 if(!link?.account_uuid)throw new PupError(403,'PRIVACY_ACCOUNT_REQUIRED');
 const {data:account,error:accountError}=await db.from('pup_accounts').select('id,username,status').eq('id',link.account_uuid).maybeSingle();
 if(accountError)throw new PupError(503,'PRIVACY_UNAVAILABLE');
 if(!account)throw new PupError(403,'PRIVACY_ACCOUNT_REQUIRED');
 return {uid,account};
}
function rowResult(result){if(result.error)throw new PupError(503,'PRIVACY_UNAVAILABLE');return result.data;}
export default async function handler(req,res){
 try{
  validateRequest(req,res);
  if(!req.body||typeof req.body!=='object'||Array.isArray(req.body))throw new PupError(400,'PRIVACY_INVALID_REQUEST');
  const {action,...args}=req.body;
  if(!['list','create'].includes(action))throw new PupError(400,'PRIVACY_INVALID_REQUEST');
  if(action==='list'&&Object.keys(args).length)throw new PupError(400,'PRIVACY_INVALID_REQUEST');
  const input=action==='create'?normalizePrivacyRequest(args):null;
  const db=dbClient();
  const {uid,account}=await getPrivacyIdentity(req,db);
  let rows;
  if(action==='create'){
   const since=new Date(Date.now()-24*60*60*1000).toISOString();
   const countResult=await db.from('pup_privacy_requests').select('id',{count:'exact',head:true}).eq('account_uuid',account.id).gte('submitted_at',since);
   if(countResult.error)throw new PupError(503,'PRIVACY_UNAVAILABLE');
   if(!privacyRequestsAllowed(countResult.count))throw new PupError(429,'PRIVACY_RATE_LIMITED');
   const inserted=rowResult(await db.from('pup_privacy_requests')
    .insert({account_uuid:account.id,auth_user_id:uid,type:input.type,request_note:input.note})
    .select('id,type,state,submitted_at,updated_at,deadline_at').single());
   rows=[inserted];
  }else{
   rows=rowResult(await db.from('pup_privacy_requests').select('id,type,state,submitted_at,updated_at,deadline_at')
    .eq('account_uuid',account.id).order('submitted_at',{ascending:false}).limit(30));
  }
  return res.status(action==='create'?201:200).json({ok:true,requests:publicRequestRows(rows)});
 }catch(error){
  if(error?.message==='PRIVACY_INVALID_REQUEST')return res.status(400).json({ok:false,error:'PRIVACY_INVALID_REQUEST'});
  return fail(res,error);
 }
}
