export function createChatClient(supabase){
 return async function requestChat(action,params={},method="GET"){
  const session=await supabase.auth.getSession();
  const token=session.data?.session?.access_token;
  if(session.error||!token)throw Error("SIGN_IN_REQUIRED");
  const query=method==="GET"?"?"+new URLSearchParams({action,...params}).toString():"";
  const response=await fetch("/api/chat"+query,{
   method,headers:{"Authorization":"Bearer "+token,...(method==="POST"?{"Content-Type":"application/json"}:{})},
   credentials:"same-origin",cache:"no-store",
   ...(method==="POST"?{body:JSON.stringify({action,...params})}:{})
  });
  const data=await response.json().catch(()=>null);
  if(!response.ok||data?.ok!==true)throw Error(data?.error||"CHAT_UNAVAILABLE");
  return data;
 };
}
