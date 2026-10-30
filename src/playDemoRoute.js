// The empty query key is deliberate: /play?=demo is the published demo URL.
// This only selects the isolated sample component; it never relaxes the
// authentication gate for the real /play app.
export function isPlayDemoRoute(pathname, search = "") {
 if(pathname!=="/play")return false;
 const params=new URLSearchParams(search);
 return params.getAll("").length===1&&params.get("")==="demo";
}
