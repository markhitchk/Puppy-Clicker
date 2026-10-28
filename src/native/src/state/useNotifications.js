
import React,{useCallback,useEffect,useState} from "react";
import {reminderPlan} from "../engine/inbox.js";
export function useNotifications({game,ready,act,onOpen}){
 const [permission,setPermission]=useState(typeof Notification!=="undefined"?Notification.permission:"unsupported");
 const [error,setError]=useState("");
 useEffect(()=>{
  if(!ready)return;
  act({type:"checkNotifications",now:Date.now()});
  const timer=setInterval(()=>act({type:"checkNotifications",now:Date.now()}),60000);
  return()=>clearInterval(timer);
 },[act,ready]);
 const request=useCallback(async()=>{
  if(typeof Notification==="undefined"){setPermission("unsupported");return false;}
  try{const p=await Notification.requestPermission();setPermission(p);return p==="granted";}
  catch{setError("Browser notification permission was not granted.");return false;}
 },[]);
 const sendTest=useCallback(()=>{
  act({type:"testNotification",now:Date.now()});
  if(typeof Notification!=="undefined"&&Notification.permission==="granted")
   try{new Notification("Puppy Clicker",{body:"Your browser notifications are working."});setError("");}catch{setError("This browser cannot display a notification here. The test message is in your in-game inbox.");}
 },[act]);
 return {permission,error,request,sendTest,openSystemSettings:request,check:()=>act({type:"checkNotifications",now:Date.now()})};
}
