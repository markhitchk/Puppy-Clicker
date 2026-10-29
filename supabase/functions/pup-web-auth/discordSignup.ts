import {createHmac,timingSafeEqual} from "node:crypto";
import {Buffer} from "node:buffer";

export type DiscordIdentity={
 id:string;
 username:string;
 globalName:string|null;
 avatarHash:string|null;
 email:string|null;
};
type TicketBody=DiscordIdentity&{v:1,iat:number,exp:number,nonce:string};
const USER_ID=/^\d{15,22}$/;
const AVATAR_HASH=/^[a-zA-Z0-9_]{1,128}$/;
const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_AGE_MS=10*60*1000;

export function sanitizeDiscordIdentity(profile:Record<string,unknown>):DiscordIdentity{
 const id=typeof profile?.id==="string"?profile.id:"";
 if(!USER_ID.test(id))throw Error("DISCORD_ID_INVALID");
 const username=typeof profile.username==="string"?profile.username.trim().slice(0,80):"";
 if(!username)throw Error("PUP_DISCORD_PROFILE_INVALID");
 const globalName=typeof profile.global_name==="string"?profile.global_name.trim().slice(0,80)||null:null;
 const avatarHash=typeof profile.avatar==="string"&&AVATAR_HASH.test(profile.avatar)?profile.avatar:null;
 const rawEmail=typeof profile.email==="string"?profile.email.trim().toLowerCase():null;
 const email=profile.verified===true&&rawEmail&&rawEmail.length<=254&&EMAIL.test(rawEmail)?rawEmail:null;
 return {id,username,globalName,avatarHash,email};
}
function sign(body:string,secret:string){
 if(!secret||secret.length<30)throw Error("PUP_DISCORD_TICKET_SECRET_UNAVAILABLE");
 return createHmac("sha256",secret).update("puppy-clicker:discord-registration:v1:").update(body).digest("base64url");
}
export function makeDiscordSignupTicket(profile:DiscordIdentity,secret:string,now=Date.now()){
 const body:TicketBody={...profile,v:1,iat:now,exp:now+MAX_AGE_MS,nonce:crypto.randomUUID()};
 const payload=Buffer.from(JSON.stringify(body),"utf8").toString("base64url");
 return payload+"."+sign(payload,secret);
}
export function verifyDiscordSignupTicket(ticket:unknown,secret:string,now=Date.now()):DiscordIdentity{
 if(typeof ticket!=="string"||ticket.length>2800||!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(ticket))
  throw Error("PUP_DISCORD_SIGNUP_EXPIRED");
 const [body,signature]=ticket.split(".");
 const expected=Buffer.from(sign(body,secret),"base64url");
 const actual=Buffer.from(signature,"base64url");
 if(actual.length!==expected.length||!timingSafeEqual(actual,expected))
  throw Error("PUP_DISCORD_SIGNUP_EXPIRED");
 let obj:TicketBody;
 try{obj=JSON.parse(Buffer.from(body,"base64url").toString("utf8"))}catch{throw Error("PUP_DISCORD_SIGNUP_EXPIRED");}
 if(obj?.v!==1||!Number.isFinite(obj.iat)||!Number.isFinite(obj.exp)||
  now<obj.iat||now>obj.exp||obj.exp-obj.iat!==MAX_AGE_MS||!obj.nonce)
  throw Error("PUP_DISCORD_SIGNUP_EXPIRED");
 // Revalidate signed claims so a future serializer change cannot weaken constraints.
 const valid=sanitizeDiscordIdentity({
  id:obj.id,username:obj.username,global_name:obj.globalName,
  avatar:obj.avatarHash,email:obj.email,verified:Boolean(obj.email)
 });
 if(valid.id!==obj.id)return (()=>{throw Error("PUP_DISCORD_SIGNUP_EXPIRED");})();
 return valid;
}
