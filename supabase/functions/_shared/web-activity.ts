import {isIP} from 'node:net';
export function classifyAuthActivity(action:string,status:number,payload:any){
 const failed=status>=400||!!payload?.error;
 const errorCode=failed&&/^[A-Z][A-Z0-9_]{2,79}$/.test(payload?.error||'')?payload.error:failed?'PUP_WEB_AUTH_UNAVAILABLE':null;
 if(['register','discord-register'].includes(action))return {event:failed?'register_failed':'register_success',outcome:failed?'failure':'success',provider:action==='discord-register'?'discord':'password',errorCode};
 if(action==='password-login')return {event:failed?'login_failed':'login_success',outcome:failed?'failure':'success',provider:'password',errorCode};
 if(action==='discord-exchange')return {event:failed?'login_failed':payload?.registration_required?'discord_registration_required':'discord_authorized',outcome:failed?'failure':'info',provider:'discord',errorCode};
 return failed?{event:'service_error',outcome:'failure',provider:null,errorCode}:null;
}
async function writeAuthActivity(req:Request,response:Response,db:any,context:any){
 try{
  const body=await req.json();
  if(response.ok&&!['register','discord-register','password-login','discord-exchange'].includes(body?.action))return;
  const payload=await response.clone().json();
  const event=classifyAuthActivity(body?.action,response.status,payload);
  if(!event)return;
  const identifier=body.action==='password-login'?body.login:
   ['register','discord-register'].includes(body.action)?body.username:null;
  const hint=typeof identifier==='string'&&/^[A-Za-z0-9_-]{3,20}$/.test(identifier)?identifier:null;
  let accountUuid=context.accountUuid||null,authUserId=context.authUserId||null;
  // Failed credentials never establish ownership of an attempted username.
  if(!accountUuid&&event.outcome==='success'&&hint){
   const {data}=await db.from('pup_accounts').select('id').ilike('username',hint.replace(/[_%\\]/g,'\\$&')).maybeSingle();
   accountUuid=data?.id||null;
  }else if(!accountUuid&&req.headers.get('authorization')?.startsWith('Bearer ')){
   const {data}=await db.auth.getUser(req.headers.get('authorization')!.slice(7));
   if(data?.user){
    const {data:link}=await db.from('pup_web_auth_links').select('account_uuid').eq('auth_user_id',data.user.id).maybeSingle();
    accountUuid=link?.account_uuid||null;authUserId=link?data.user.id:null;
   }
  }
  const candidate=(req.headers.get('x-forwarded-for')||req.headers.get('x-real-ip')||'').split(',')[0].trim();
  const rawPath=(req.headers.get('x-pup-path')||'/account').split(/[?#]/)[0];
  const path=/^\/(?:play|account(?:\/admin(?:\/(?:users|bans|audit|gifts|activity))?)?|register|recovery|auth\/discord\/callback)?\/?$/.test(rawPath)?rawPath:'/other';
  const sid=req.headers.get('x-pup-session-id');
  const {error}=await db.rpc('record_pup_web_activity',{
   p_session_id:sid&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sid)?sid:null,
   p_account_uuid:accountUuid,p_auth_user_id:authUserId,p_event_code:event.event,p_source:'server',
   p_outcome:event.outcome,p_path:path,p_ip:isIP(candidate)?candidate:null,
   p_user_agent:(req.headers.get('user-agent')||'').slice(0,1024),p_error_code:event.errorCode,p_provider:event.provider,p_login_hint:hint
  });
  if(error)console.error('Pup website activity recording unavailable');
  // Send only successful authentication events to the configured private Discord
  // webhook. The URL is a server-side secret and is never returned to clients.
  if(event.outcome==='success'&&['register_success','login_success'].includes(event.event)){
   const webhook=Deno.env.get('PUP_AUTH_DISCORD_WEBHOOK_URL');
   if(webhook){
    const eventLabel=event.event==='register_success'?'New registration':'Successful login';
    const timestamp=new Date().toISOString();
    const message={
     embeds:[{
      title:'Puppy Clicker · '+eventLabel,
      color:0x8B5CF6,
      fields:[
       {name:'Username',value:hint||'Unavailable',inline:true},
       {name:'Event',value:event.event,inline:true},
       {name:'Time (UTC)',value:timestamp,inline:false}
      ],
      footer:{text:'Puppy Clicker authentication'}
     }]
    };
    try{
     const result=await fetch(webhook,{method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify(message),signal:AbortSignal.timeout(2500)});
     if(!result.ok)console.error('Puppy auth Discord notification failed');
    }catch{console.error('Puppy auth Discord notification unavailable');}
   }
  }
 }catch{/* Audit failure must never change a successful authentication result. */}
}
export async function auditAuthResponse(req:Request,response:Response,db:any,context:any={},deadlineMs=1800){
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{
  await Promise.race([writeAuthActivity(req,response,db,context),new Promise<void>(resolve=>{
   timer=setTimeout(resolve,deadlineMs);
  })]);
 }finally{clearTimeout(timer);}
}
