// Browser Puppy Exchange uses the existing verified Supabase Pup Account JWT.
// The server resolves account ownership from pup_web_auth_links, never from
// user-supplied account, installation or player identifiers.
const allowedOperations=new Set([
 "profile","lookup","request","respond","remove","offer","counter",
 "confirm","decline","cancel"
]);
function failure(code){
 const error=new Error(code);error.code=code;return error;
}
export async function requestWebPuppyExchange(client,operation,fields={}){
 if(!client?.functions?.invoke)throw failure("EXCHANGE_WEB_SESSION_REQUIRED");
 if(!allowedOperations.has(operation))throw failure("EXCHANGE_ACTION_INVALID");
 const {data,error}=await client.functions.invoke("pup-exchange",{
  body:{...fields,operation}
 });
 if(error){
  let code="EXCHANGE_SERVICE_UNAVAILABLE";
  try{
   const detail=await error.context?.json?.();
   const candidate=detail?.code||detail?.error;
   if(typeof candidate==="string"&&/^[A-Z0-9_]{3,80}$/.test(candidate))code=candidate;
  }catch{}
  throw failure(code);
 }
 if(!data||typeof data!=="object"||Array.isArray(data))
  throw failure("EXCHANGE_RESPONSE_INVALID");
 return data;
}
