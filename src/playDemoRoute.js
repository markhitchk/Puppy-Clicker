// The public demo lives at /play?demo=1. The older /play?=demo link (empty
// query key) stays supported because it was already published.
// This only selects the isolated sample component; it never relaxes the
// authentication gate for the real /play app.
export function isPlayDemoRoute(pathname, search = "") {
 if(pathname!=="/play")return false;
 const params=new URLSearchParams(search);
 const legacy=params.getAll("").length===1&&params.get("")==="demo";
 const current=params.getAll("demo").length===1&&params.get("demo")==="1";
 // Mixing both forms is rejected, so exactly one explicit demo marker opens it.
 return (legacy&&!params.has("demo"))||(current&&!params.has(""));
}
