// Puppy Clicker web <-> Android Discord authorization-code relay.
// Never returns a code without the original browser's 256-bit poll secret.
// Neither this endpoint nor the mobile app authorizes a Pup Account by itself.
import {createClient} from "npm:@supabase/supabase-js@2.117.1";
const SUPABASE_URL=Deno.env.get("SUPABASE_URL");
const SERVICE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if(!SUPABASE_URL||!SERVICE_KEY)throw Error("Puppy Discord relay backend configuration missing");
const admin=createClient(SUPABASE_URL,SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const WEB_ORIGIN="https://puppy-clicker.vercel.app";
const ORIGINS=new Set([WEB_ORIGIN,"http://127.0.0.1:4173","http://localhost:5173"]);
const states=/^pcw1_[A-Za-z0-9_-]{32,64}$/;
const secrets=/^[A-Za-z0-9_-]{43,64}$/;
const digests=/^[0-9a-f]{64}$/;
const codes=/^[A-Za-z0-9_-]{8,2048}$/;
const headers=origin=>({
 "content-type":"application/json","cache-control":"no-store",
 "access-control-allow-origin":ORIGINS.has(origin)?origin:WEB_ORIGIN,
 "access-control-allow-headers":"authorization,apikey,content-type,x-client-info",
 "access-control-allow-methods":"POST,OPTIONS","vary":"Origin"
});
const response=(status,value,origin)=>new Response(JSON.stringify(value),{status,headers:headers(origin)});
async function sha256(value){
 const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));
 return Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,"0")).join("");
}
Deno.serve(async request=>{
 const origin=request.headers.get("origin")||"";
 if(request.method==="OPTIONS")return response(200,{},origin);
 if(request.method!=="POST")return response(405,{error:"METHOD_NOT_ALLOWED"},origin);
 let action="";
 try{
  const body=await request.json();
  action=String(body?.action||"");
  const native=action==="relay-submit"&&!origin;
  if(!ORIGINS.has(origin)&&!native)return response(403,{error:"ORIGIN_NOT_ALLOWED"},origin);
  const state=body?.state;
  if(typeof state!=="string"||!states.test(state))return response(400,{error:"STATE_INVALID"},origin);
  const now=new Date().toISOString();
  if(action==="relay-start"){
   const digest=body?.poll_digest;
   if(typeof digest!=="string"||!digests.test(digest))
    return response(400,{error:"POLL_DIGEST_INVALID"},origin);
   // Bound storage: expire stale requests on every new authorization.
   await admin.from("pup_web_discord_relay").delete().lt("expires_at",now);
   const {error}=await admin.from("pup_web_discord_relay").insert({state,poll_digest:digest});
   if(error)return response(409,{error:"RELAY_START_CONFLICT"},origin);
   return response(200,{ok:true,expiresIn:300},origin);
  }
  if(action==="relay-submit"){
   // Called from the updated Android native application after Android receives
   // discord-1547982688898777118:/authorize/callback?code=...&state=...
   // A forged submission cannot establish identity: Discord verifies PKCE
   // with the verifier held exclusively in the original browser.
   const code=body?.code;
   if(typeof code!=="string"||!codes.test(code))
    return response(400,{error:"DISCORD_CODE_INVALID"},origin);
   const {data,error}=await admin.from("pup_web_discord_relay")
    .update({authorization_code:code}).eq("state",state)
    .is("authorization_code",null).gt("expires_at",now)
    .select("state").maybeSingle();
   if(error)return response(503,{error:"RELAY_UNAVAILABLE"},origin);
   return data?response(200,{ok:true},origin):response(404,{error:"RELAY_NOT_AVAILABLE"},origin);
  }
  if(action==="relay-poll"){
   const secret=body?.poll_secret;
   if(typeof secret!=="string"||!secrets.test(secret))
    return response(400,{error:"POLL_SECRET_INVALID"},origin);
   const digest=await sha256(secret);
   const {data,error}=await admin.from("pup_web_discord_relay")
    .select("authorization_code,expires_at").eq("state",state)
    .eq("poll_digest",digest).gt("expires_at",now).maybeSingle();
   if(error)return response(503,{error:"RELAY_UNAVAILABLE"},origin);
   if(!data)return response(410,{error:"RELAY_EXPIRED_OR_UNAUTHORIZED"},origin);
   if(!data.authorization_code)return response(200,{ready:false},origin);
   // Atomically consume the code before returning it. Retries require a
   // fresh Discord authorization, preventing replay and competing sessions.
   const {data:removed,error:de}=await admin.from("pup_web_discord_relay")
    .delete().eq("state",state).eq("poll_digest",digest)
    .select("authorization_code").maybeSingle();
   if(de||!removed?.authorization_code)return response(409,{error:"RELAY_CONSUMED"},origin);
   return response(200,{ready:true,code:removed.authorization_code},origin);
  }
  return response(400,{error:"ACTION_INVALID"},origin);
 }catch{
  return response(503,{error:"RELAY_UNAVAILABLE"},origin);
 }
});
