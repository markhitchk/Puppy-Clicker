export async function privacyApi(client,action,payload={}){
 if(!client)throw Error('PRIVACY_UNAVAILABLE');
 const {data,error}=await client.auth.getSession();
 const token=data?.session?.access_token;
 if(error||!token)throw Error('PRIVACY_AUTH_REQUIRED');
 const res=await fetch('/api/privacy',{
  method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},
  credentials:'same-origin',cache:'no-store',body:JSON.stringify({action,...payload})
 });
 const json=await res.json().catch(()=>null);
 if(!res.ok||json?.ok!==true)throw Error(json?.error||'PRIVACY_UNAVAILABLE');
 return json.requests||[];
}
