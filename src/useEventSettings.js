import {useEffect,useState} from 'react';
import {client} from './supabase.js';
import {normalizeEventSettings} from '../supabase/functions/_shared/event-settings.js';
export default function useEventSettings(){
 const [settings,setSettings]=useState(null);
 useEffect(()=>{
  let alive=true,sequence=0;
  const refresh=async()=>{const id=++sequence;try{const {data,error}=await client.rpc('pup_event_settings_public');if(alive&&id===sequence)setSettings(error?null:normalizeEventSettings(data));}catch{if(alive&&id===sequence)setSettings(null);}};
  void refresh();const timer=setInterval(refresh,30000);window.addEventListener('focus',refresh);window.addEventListener('pup-event-settings-changed',refresh);
  return()=>{alive=false;clearInterval(timer);window.removeEventListener('focus',refresh);window.removeEventListener('pup-event-settings-changed',refresh);};
 },[]);
 return settings;
}
