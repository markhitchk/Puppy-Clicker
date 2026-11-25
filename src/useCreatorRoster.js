import {useEffect,useState} from "react";
import {client} from "./supabase.js";
import {normalizeCreatorRoster} from "./creatorRoster.js";
export function useCreatorRoster(){
 const [items,setItems]=useState([]);
 useEffect(()=>{
  if(!client)return;let active=true,revision=0;
  const refresh=async()=>{const seq=++revision;try{const {data,error}=await client.rpc("pup_creator_roster");if(!error&&active&&seq===revision)setItems(normalizeCreatorRoster(data));}catch{}};
  void refresh();window.addEventListener("focus",refresh);const timer=setInterval(refresh,60000);
  return()=>{active=false;clearInterval(timer);window.removeEventListener("focus",refresh);};
 },[]);
 return items;
}
