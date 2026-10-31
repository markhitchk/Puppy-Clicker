// @username references are limited to members of the same Puppy Clicker community server.
const HANDLE=/(?<![\w@])@([A-Za-z0-9_-]{3,20})(?![\w.-])/g;
export function extractChatMentions(text){
 if(typeof text!=="string")return [];
 return [...new Set([...text.matchAll(HANDLE)].map(m=>m[1].toLowerCase()))];
}
export function activeMentionQuery(text){
 if(typeof text!=="string")return null;
 const match=text.match(/(?:^|\s)@([A-Za-z0-9_-]{1,20})$/);
 return match?match[1]:null;
}
export function splitChatText(text){
 if(typeof text!=="string")return [];
 const result=[];let last=0;
 for(const m of text.matchAll(HANDLE)){
  if(m.index>last)result.push({type:"text",value:text.slice(last,m.index)});
  result.push({type:"mention",value:m[0],username:m[1].toLowerCase()});
  last=m.index+m[0].length;
 }
 if(last<text.length)result.push({type:"text",value:text.slice(last)});
 return result;
}
