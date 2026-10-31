import React,{useEffect,useState} from "react";
import {normalizeAvatarUrl} from "./avatarUrl.js";
import "./UserAvatar.css";
export default function UserAvatar({src,name="",className=""}){
 const valid=normalizeAvatarUrl(src);
 const [failed,setFailed]=useState(false);
 useEffect(()=>setFailed(false),[valid]);
 const initial=Array.from(name.trim())[0]?.toLocaleUpperCase()||"🐾";
 return <span className={"chat-user-avatar "+className} role="img" aria-label={"Avatar for "+(name||"player")}>
  {valid&&!failed?<img src={valid} alt="" loading="lazy" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>:<span aria-hidden="true">{initial}</span>}
 </span>;
}
