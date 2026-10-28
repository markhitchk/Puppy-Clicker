import {createClient} from "npm:@supabase/supabase-js@2.117.1";

// Manual intake is intentionally separate from sign-in and account recovery
// authorization. A submitted form never updates credentials, Discord links,
// Android installation ownership or cloud-save records.
const ORIGINS=new Set([
 "https://puppy-clicker.vercel.app","http://localhost:5173",
 "http://127.0.0.1:4173"
]);
const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME=/^[A-Za-z0-9_-]{3,20}$/;
const REFERENCE=/^PUP-RC-[A-F0-9]{20}$/;
const TYPES=new Set(["lost_password","lost_discord","lost_both","device_change","other"]);
const url=Deno.env.get("SUPABASE_URL");
const secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if(!url||!secret)throw Error("Pup recovery configuration unavailable");
const admin=createClient(url,secret,{auth:{
 persistSession:false,autoRefreshToken:false,detectSessionInUrl:false
}});

const respond=(status,body,origin)=>new Response(JSON.stringify(body),{
 status,headers:{
  "content-type":"application/json","cache-control":"no-store",
  "access-control-allow-origin":ORIGINS.has(origin)?origin:"https://puppy-clicker.vercel.app",
  "access-control-allow-headers":"authorization,apikey,content-type,x-client-info",
  "access-control-allow-methods":"POST,OPTIONS","vary":"Origin"
 }
});
const validEmail=value=>typeof value==="string"&&value.length<=254&&EMAIL.test(value);
const randomRef=()=>"PUP-RC-"+Array.from(crypto.getRandomValues(new Uint8Array(10)),
 b=>b.toString(16).padStart(2,"0")).join("").toUpperCase();
async function digestSource(req){
 // Throttling is best-effort only. A network address is never used as
 // account ownership evidence or authorization.
 const forwarded=req.headers.get("cf-connecting-ip")
  ||req.headers.get("x-real-ip")
  ||req.headers.get("x-forwarded-for")?.split(",")[0]
  ||"unknown";
 const bytes=new TextEncoder().encode(secret+":"+forwarded.slice(0,96));
 return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)),
  b=>b.toString(16).padStart(2,"0")).join("");
}
async function countRecent(key,value,since){
 const {count,error}=await admin.from("pup_recovery_requests")
  .select("id",{head:true,count:"exact"}).eq(key,value).gte("created_at",since);
 if(error)throw Error("SUPPORT_QUEUE_UNAVAILABLE");
 return count||0;
}
Deno.serve(async req=>{
 const origin=req.headers.get("origin")||"";
 if(req.method==="OPTIONS")return respond(200,{},origin);
 if(req.method!=="POST")return respond(405,{error:"METHOD_NOT_ALLOWED"},origin);
 if(!ORIGINS.has(origin))return respond(403,{error:"ORIGIN_NOT_ALLOWED"},origin);
 try{
  const body=await req.json();
  if(!body||typeof body!=="object"||Array.isArray(body))
   return respond(400,{error:"REQUEST_INVALID"},origin);
  if(body.action==="status"){
   const reference=typeof body.reference==="string"?body.reference.trim().toUpperCase():"";
   const email=typeof body.contactEmail==="string"?body.contactEmail.trim().toLowerCase():"";
   if(!REFERENCE.test(reference)||!validEmail(email))
    return respond(400,{error:"RECOVERY_REFERENCE_INVALID"},origin);
   const {data,error}=await admin.from("pup_recovery_requests")
    .select("status,created_at").eq("reference",reference)
    .eq("email_key",email).maybeSingle();
   if(error)throw Error("SUPPORT_STATUS_UNAVAILABLE");
   // No account existence, internal notes, contact details or identity data.
   return respond(200,{found:!!data,status:data?.status||null,
    submittedAt:data?.created_at||null},origin);
  }
  if(body.action!=="request")
   return respond(400,{error:"ACTION_INVALID"},origin);
  // Honeypot: ordinary users never see this field.
  if(body.website)return respond(200,{accepted:true,reference:null},origin);
  const username=typeof body.username==="string"?body.username.trim():"";
  const contactEmail=typeof body.contactEmail==="string"?body.contactEmail.trim().toLowerCase():"";
  const issueType=body.issueType;
  const details=typeof body.details==="string"?body.details.trim():"";
  if(!USERNAME.test(username)||!validEmail(contactEmail)||!TYPES.has(issueType)
   ||details.length<20||details.length>1000)
   return respond(400,{error:"RECOVERY_DETAILS_INVALID"},origin);
  const usernameKey=username.toLowerCase();
  const ipDigest=await digestSource(req);
  const since24=new Date(Date.now()-24*60*60*1000).toISOString();
  const counts=await Promise.all([
   countRecent("username_key",usernameKey,since24),
   countRecent("email_key",contactEmail,since24),
   countRecent("requester_digest",ipDigest,since24)
  ]);
  if(counts[0]>=2||counts[1]>=3||counts[2]>=7)
   return respond(429,{error:"RECOVERY_RATE_LIMITED"},origin);
  // Do NOT look up usernames or send a reset link to user-supplied email.
  // Support alone must independently verify ownership before any manual fix.
  const reference=randomRef();
  const {error}=await admin.from("pup_recovery_requests").insert({
   reference,requested_username:username,username_key:usernameKey,
   contact_email:contactEmail,email_key:contactEmail,issue_type:issueType,
   details,requester_digest:ipDigest
  });
  if(error)throw Error("SUPPORT_QUEUE_UNAVAILABLE");
  return respond(201,{accepted:true,reference},origin);
 }catch(e){
  console.error("Pup recovery request failed; private details withheld");
  return respond(503,{error:"RECOVERY_UNAVAILABLE"},origin);
 }
});
