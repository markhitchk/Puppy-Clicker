import {useEffect,useState} from "react";
import {client} from "./supabase.js";

// Only signed-out visitors may use the unsaved public demo. Supabase Auth is
// shared with other projects: treat any authenticated session as signed-in and
// let the normal /play gate verify Puppy Clicker ownership and account standing.
export function useDemoAccess(){
 const [access,setAccess]=useState("checking");
 useEffect(()=>{
  if(!client){setAccess("guest");return;}
  let active=true,request=0;
  const refresh=async()=>{
   const version=++request;
   let next="checking";
   try{
    const {data,error}=await client.auth.getUser();
    if(error){
     // Network or refresh failures must not turn a stored signed-in session
     // into an unrestricted guest preview.
     const cached=await client.auth.getSession();
     next=cached.data?.session?.user?"member":"guest";
    }else next=data?.user?"member":"guest";
   }catch{
    // If neither authoritative nor cached session can be read, don't guess.
    next="checking";
   }
   if(active&&version===request)setAccess(next);
  };
  const {data}=client.auth.onAuthStateChange(event=>{
   if(event==="SIGNED_OUT"){++request;setAccess("guest");return;}
   // Don't make an Auth request while Supabase is holding its auth lock.
   setAccess("checking");
   setTimeout(()=>{if(active)void refresh();},0);
  });
  void refresh();
  return()=>{active=false;++request;data?.subscription?.unsubscribe();};
 },[]);
 return access;
}
