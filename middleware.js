// Vercel middleware renders puppy-specific metadata into the initial HTML.
// Social preview scrapers (Discord, Google Messages/RCS, etc.) do not execute JS.
// Return the normal Vite document with its scripts intact for human visitors.
import {applyPuppySharePreview,getPuppySharePreview} from "./src/puppySharePreview.js";

import {puppyService} from "./src/supabaseConfig.js";

export const config={matcher:["/pupdex","/puppies"]};

export default async function middleware(request){
 const url=new URL(request.url);
 if(url.pathname==="/puppies"||url.pathname==="/puppies/"){
  url.pathname="/pupdex";
  return Response.redirect(url,308);
 }
 let preview=getPuppySharePreview(url.search);
 if(preview){
  try{
   const catalog=await fetch(puppyService.url+"/rest/v1/rpc/pup_rarity_public",{
    method:"POST",headers:{apikey:puppyService.key,"Content-Type":"application/json"},body:"{}",cache:"no-store",
    signal:AbortSignal.timeout(2500)
   });
   const rows=catalog.ok?await catalog.json():[];
   if(!Array.isArray(rows)||!rows.some(p=>p.puppy_id===preview.id&&p.published))preview=null;
  }catch{preview=null;}
 }
 const documentUrl=new URL("/index.html",url);
 const headers=new Headers({accept:"text/html"});
 // Forward Vercel preview authentication only to the same deployment origin.
 const cookie=request.headers.get("cookie");
 if(cookie)headers.set("cookie",cookie);
 const response=await fetch(documentUrl,{headers,redirect:"follow"});
 if(!response.ok)return response;
 const html=await response.text();
 const output=applyPuppySharePreview(html,preview);
 const resultHeaders=new Headers({
  "Content-Type":"text/html; charset=utf-8",
  "Cache-Control":"private, no-store",
  "X-Content-Type-Options":"nosniff"
 });
 for(const key of ["content-security-policy","referrer-policy","x-frame-options"]){
  const value=response.headers.get(key);
  if(value)resultHeaders.set(key,value);
 }
 return new Response(request.method==="HEAD"?null:output,{status:200,headers:resultHeaders});
}
