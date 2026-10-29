import {createClient} from "@supabase/supabase-js";
import {getClientIp} from "./_lib/networkRisk.js";
import {isBrowserSessionId,safeWebsitePath} from "./_lib/webPresence.js";
import {findActiveIpBan} from "./_lib/ipBan.js";

const respond=(res,status,body)=>{
  res.setHeader("Cache-Control","private, no-store, max-age=0");
  return res.status(status).json(body);
};
const makeDb=()=>{
  const url=process.env.SUPABASE_URL;
  const key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)return null;
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
};

// Website presence is recorded only for a *verified* Supabase Auth identity
// linked to an existing Pup Account. Never trust browser-supplied account IDs.
export default async function handler(req,res){
  if(req.method!=="POST"){
    res.setHeader("Allow","POST");
    return respond(res,405,{ok:false,error:"METHOD_NOT_ALLOWED"});
  }
  if(Number(req.headers["content-length"]||0)>2048)
    return respond(res,413,{ok:false,error:"REQUEST_TOO_LARGE"});
  const origin=req.headers.origin;
  if(origin){
    try {
      const parsed=new URL(origin);
      if(parsed.host!==req.headers.host || process.env.VERCEL==="1"&&parsed.protocol!=="https:")
        return respond(res,403,{ok:false,error:"ORIGIN_NOT_ALLOWED"});
    } catch {return respond(res,403,{ok:false,error:"ORIGIN_NOT_ALLOWED"});}
  }
  const browserSessionId=req.body?.browserSessionId;
  if(!isBrowserSessionId(browserSessionId))
    return respond(res,400,{ok:false,error:"SESSION_ID_INVALID"});
  const auth=String(req.headers.authorization||"");
  if(!/^Bearer\s+[^\s]+$/.test(auth)||auth.length>5000)
    return respond(res,401,{ok:false,error:"SIGN_IN_REQUIRED"});

  const db=makeDb();
  if(!db)return respond(res,503,{ok:false,error:"PRESENCE_UNAVAILABLE"});
  try{
    if(await findActiveIpBan(db,req.headers))return respond(res,403,{ok:false,error:"IP_BANNED"});
    const {data:identity,error:userError}=await db.auth.getUser(auth.slice(7));
    if(userError||!identity?.user?.id)
      return respond(res,401,{ok:false,error:"SIGN_IN_REQUIRED"});
    const authUserId=identity.user.id;
    const {data:link,error:linkError}=await db.from("pup_web_auth_links")
      .select("account_uuid").eq("auth_user_id",authUserId).maybeSingle();
    if(linkError)throw linkError;
    if(!link?.account_uuid)return respond(res,403,{ok:false,error:"PUP_ACCOUNT_REQUIRED"});
    const {data:account,error:accountError}=await db.from("pup_accounts")
      .select("id,status").eq("id",link.account_uuid).maybeSingle();
    if(accountError)throw accountError;
    if(!account||account.status!=="active")
      return respond(res,403,{ok:false,error:"ACCOUNT_NOT_ACTIVE"});

    const identityKey="pup_account:"+account.id;
    const path=safeWebsitePath(req.body?.path);
    const userAgent=String(req.headers["user-agent"]||"").slice(0,1024);
    const ip=getClientIp(req.headers,process.env.VERCEL==="1");
    const seen=new Date().toISOString();
    const match=db.from("pup_web_sessions")
      .select("id,path").eq("browser_session_id",browserSessionId)
      .eq("identity_key",identityKey).maybeSingle();
    const {data:existing,error:readError}=await match;
    if(readError)throw readError;
    // A later request without an IP or User-Agent must not erase previously
    // observed connection details for the same verified web session.
    const update={path,last_seen_at:seen,ended_at:null};
    if(ip)update.ip_address=ip;
    if(userAgent)update.user_agent=userAgent;
    let error;
    if(existing){
      ({error}=await db.from("pup_web_sessions").update(update).eq("id",existing.id));
    } else {
      ({error}=await db.from("pup_web_sessions").insert({
        browser_session_id:browserSessionId,identity_key:identityKey,
        account_uuid:account.id,auth_user_id:authUserId,
        ip_address:ip,user_agent:userAgent,...update
      }));
      // Two simultaneous first heartbeats for the same browser are harmless.
      if(error?.code==="23505")
        ({error}=await db.from("pup_web_sessions").update(update)
          .eq("browser_session_id",browserSessionId).eq("identity_key",identityKey));
    }
    if(error)throw error;
    if(!existing||existing.path!==path){
      // Informational page-view only; never pretend a page view is a login.
      // Failure to write an audit event must not lose the connection heartbeat.
      const event=await db.from("pup_web_activity_events").insert({
        browser_session_id:browserSessionId,account_uuid:account.id,
        auth_user_id:authUserId,event_code:"page_view",source:"server",
        outcome:"info",path,ip_address:ip,user_agent:userAgent
      });
      if(event.error)console.error("Pup website page-view audit unavailable");
    }
    return respond(res,200,{ok:true});
  } catch {
    console.error("Pup website session persistence unavailable");
    return respond(res,503,{ok:false,error:"PRESENCE_UNAVAILABLE"});
  }
}
