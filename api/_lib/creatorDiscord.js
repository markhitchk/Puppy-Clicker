// Discord credentials never enter the package, browser response or application logs.
const escaped=x=>String(x).replace(/[\\`*_~|<>@]/g,"\\$&").slice(0,240);
export async function sendCreatorDiscord(row,url,{transport=fetch,test=false}={}){
 let delivery="unknown",messageId=null;
 try{
  const form=new FormData();
  form.set("payload_json",JSON.stringify({allowed_mentions:{parse:[]},embeds:[{title:test?"🧪 Pup Creator delivery test":"🐾 New Puppy Creation",description:test?"Integration test only — no player submission or roster publication.":"Pending developer review",fields:[{name:"Submission",value:test?"Test only":row.id},{name:"Puppy",value:escaped(row.name)},{name:"Generation",value:row.generation.toUpperCase(),inline:true},{name:"Creator",value:escaped(row.username),inline:true}],image:{url:"attachment://preview.png"},footer:{text:"Pup Creator Studio"}}],attachments:[{id:0,filename:"preview.png"},{id:1,filename:"creation.pup"}]}));
  form.set("files[0]",new Blob([Buffer.from(row.project.artwork.slice(22),"base64")],{type:"image/png"}),"preview.png");
  form.set("files[1]",new Blob([JSON.stringify(test?row.project:{...row.project,submissionId:row.id})],{type:"application/json"}),"creation.pup");
  const response=await transport(url,{method:"POST",body:form,signal:AbortSignal.timeout(15000),redirect:"error"});
  if(response.ok){const json=await response.json();if(typeof json.id==="string"&&/^\d{15,22}$/.test(json.id)){delivery="delivered";messageId=json.id;}}
  else if(response.status===429||[400,401,403,404,413].includes(response.status))delivery="failed";
 }catch{}
 return {delivery,messageId};
}
