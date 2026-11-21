import {friendInviteUrl,readInviteCode} from "./friendInvite.js";
const SITE="https://puppy-clicker.vercel.app";
const usernamePattern=/^[A-Za-z0-9_-]{3,20}$/;
export function invitePreview(search,username){
 const params=new URLSearchParams(search);
 if(params.get("mode")!=="register")return null;
 const code=readInviteCode(search);
 if(!code)return null;
 const name=typeof username==="string"&&usernamePattern.test(username)?username:null;
 return {
  title:name?"🐾 @"+name+"’s Invite to Puppy Clicker":"🐾 You’re invited to Puppy Clicker!",
  description:name?"Join @"+name+" in Puppy Clicker! Collect adorable puppies, earn treats and grow your pack. Create your free Pup Account to get started.":"Collect adorable puppies, earn treats and grow your pack. Create your free Pup Account to get started.",
  url:friendInviteUrl(code),image:SITE+"/assets/logos/puppy_clicker.png",
  imageAlt:"Puppy Clicker game logo",card:"summary",imageWidth:null,imageHeight:null
 };
}
// Inviter identity is looked up server-side. Never accept an unverified username in the URL.
// Return only the public Pup username; no private account data or service key is returned.
export async function lookupInviteUsername(search,{url,key,fetcher=fetch}={}){
 const code=readInviteCode(search);
 if(!code||new URLSearchParams(search).get("mode")!=="register"||!url||!key)return null;
 const headers={apikey:key,accept:"application/json"};
 if(!key.startsWith("sb_secret_"))headers.Authorization="Bearer "+key;
 const query=async(table,filters)=>{
  const endpoint=new URL("/rest/v1/"+table,url);
  for(const [k,v] of Object.entries({...filters,limit:"2"}))endpoint.searchParams.set(k,v);
  const response=await fetcher(endpoint,{headers,cache:"no-store",signal:AbortSignal.timeout(1500)});
  if(!response.ok)return null;
  const rows=await response.json();
  return Array.isArray(rows)&&rows.length===1?rows[0]:null;
 };
 try{
  const player=await query("pupeye_players",{select:"id",friend_code:"eq."+code,status:"eq.active"});
  if(!player?.id||!/^[0-9a-f-]{36}$/i.test(player.id))return null;
  const account=await query("pup_accounts",{select:"username",player_uuid:"eq."+player.id,status:"eq.active"});
  return typeof account?.username==="string"&&usernamePattern.test(account.username)?account.username:null;
 }catch{return null;}
}
