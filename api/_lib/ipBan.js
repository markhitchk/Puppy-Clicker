import {getClientIp} from "./networkRisk.js";
// Match the IP captured by the hosting platform, never a browser-supplied value.
export async function findActiveIpBan(db,headers){
 const ip=getClientIp(headers,process.env.VERCEL==="1");
 if(!ip)return null;
 const {data,error}=await db.from("pup_web_ip_bans").select("id,ip_address,expires_at")
  .eq("ip_address",ip).is("revoked_at",null).maybeSingle();
 if(error)throw Error("IP_BAN_LOOKUP_UNAVAILABLE");
 return data&&(!data.expires_at||Date.parse(data.expires_at)>Date.now())?data:null;
}
