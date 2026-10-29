import {isIP} from "node:net";
// The server validates syntax without fetching remote image content (no SSRF).
export function normalizeAvatarUrl(value) {
 if(value===null)return null;
 if(typeof value!=="string"||!value.trim()||value.length>2048)throw Error("AVATAR_URL_INVALID");
 let url;try{url=new URL(value.trim());}catch{throw Error("AVATAR_URL_INVALID");}
 const host=url.hostname.toLowerCase();
 if(url.protocol!=="https:"||url.username||url.password||url.hash||
   (url.port&&url.port!=="443")||!host.includes(".")||isIP(host)||
   /\.(?:local|localhost|internal|test|invalid)$/.test(host)||
   !/^[a-z0-9.-]+$/.test(host)||url.href.length>2048)throw Error("AVATAR_URL_INVALID");
 return url.href;
}
