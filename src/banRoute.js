// A staff-only page target; never use this username to authorize ban actions.
// The admin API resolves a registered player's UUID and checks staff privileges.
export const isBanAccountRoute=path=>/^\/account\/bansys\/user=?\/?$/.test(path||"");
export function banTargetFromLocation(location){
 if(!isBanAccountRoute(location?.pathname))return null;
 const query=new URLSearchParams(location?.search||"");
 let raw=query.get("username")||query.get("user");
 if(!raw){
  const legacy=(location?.search||"").replace(/^\?/,"");
  try{raw=decodeURIComponent(legacy).replace(/^@/,"");}catch{return "";}
 }
 const name=(raw||"").replace(/^@/,"");
 return /^[A-Za-z0-9_-]{3,20}$/.test(name)?name:"";
}
export const banAccountUrl=username=>"/account/bansys/user=?@"+encodeURIComponent(username);
