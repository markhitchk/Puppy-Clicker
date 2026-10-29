// A convenience deterrent only. Browsers must receive the client bundle and
// users can inspect it externally. Secrets and economic authority stay server-side.
export function installInspectionDeterrent(target=document){
 const contextmenu=event=>event.preventDefault();
 const keydown=event=>{
  const key=String(event.key||'').toLowerCase();
  const devtools=(event.ctrlKey&&event.shiftKey||event.metaKey&&event.altKey)&&['i','j','c'].includes(key);
  const source=key==='u'&&(event.ctrlKey||event.metaKey&&event.altKey);
  if(key==='f12'||devtools||source)event.preventDefault();
 };
 target.addEventListener('contextmenu',contextmenu,true);
 target.addEventListener('keydown',keydown,true);
 return()=>{target.removeEventListener('contextmenu',contextmenu,true);target.removeEventListener('keydown',keydown,true)};
}
