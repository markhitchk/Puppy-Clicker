import {client} from "./supabase.js";
export async function pupWebApi(body){
 if(!client)throw Error("Pup Account connection unavailable");
 const {data,error}=await client.auth.getSession();
 const token=data?.session?.access_token;
 if(error||!token)throw Error("SIGN_IN_REQUIRED");
 const endpoint=["read","update"].includes(body.action)?"/api/avatar":"/api/gifts";
 const response=await fetch(endpoint,{method:"POST",cache:"no-store",credentials:"same-origin",
  headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},
  body:JSON.stringify(body)});
 let payload;
 try{payload=await response.json();}catch{throw Error("SERVICE_UNAVAILABLE");}
 if(!response.ok||payload.ok!==true)throw Error(payload.error||"SERVICE_UNAVAILABLE");
 return payload;
}
export const avatarForAccount=async account=>{
 try{const profile=await pupWebApi({action:"read"});
 return {...account,avatarUrl:profile.avatarUrl||null};}
 catch{return account;}
};
