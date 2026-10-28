import {loadRosterCatalog} from '../../web/rosterLoader.js';
import {useEffect,useRef,useState} from 'react';
import {AppState} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
 ROSTER_CACHE_KEY,ROSTER_REFRESH_MS,ROSTER_RETRY_MS,utf8WithinLimit,
 parseCachedRoster,packRosterCache,mergeRoster,categoriesForRoster
} from '../engine/dynamicRoster.js';

export function useRoster(){
 const controls=useRef({}),remote=useRef([]);
 const [refreshing,setRefreshing]=useState(false),[status,setStatus]=useState('Bundled artwork available offline.');
 const [snapshot,setSnapshot]=useState(()=>({
  items:mergeRoster(),source:'bundled',updatedAt:null,categories:categoriesForRoster(mergeRoster())
 }));
 useEffect(()=>{
  let alive=true,loading=false,lastAttempt=0,lastSuccess=0;
  const lifetime=new AbortController();
  const update=(remote,source)=>{if(!alive)return;
   const items=mergeRoster(remote);
   setSnapshot({items,source,updatedAt:Date.now(),categories:categoriesForRoster(items)});
  };
  const getText=async (url,maxBytes)=>{
   const controller=new AbortController(),cancel=()=>controller.abort();
   lifetime.signal.throwIfAborted();
   lifetime.signal.addEventListener('abort',cancel,{once:true});
   const timeout=setTimeout(cancel,8000);
   try{
    const response=await fetch(url,{signal:controller.signal,headers:{Accept:'application/json'}});
    if(!response.ok)throw new Error('Roster HTTP '+response.status);
    const text=await response.text();
    if(!utf8WithinLimit(text,maxBytes))throw new Error('Roster file too large');
    return text;
   }finally{clearTimeout(timeout);lifetime.signal.removeEventListener('abort',cancel);}
  };
  const refresh=async(force=false)=>{
   const now=Date.now();
   if(!alive||loading||(!force&&(now-lastSuccess<ROSTER_REFRESH_MS||now-lastAttempt<ROSTER_RETRY_MS)))return;
   loading=true;lastAttempt=now;setRefreshing(true);setStatus('Refreshing puppy assets…');
   try{
    const {assets,partial}=await loadRosterCatalog({getText,previous:remote.current,signal:lifetime.signal});
    if(!alive)return;
    remote.current=assets;
    const json=packRosterCache(assets);
    await AsyncStorage.setItem(ROSTER_CACHE_KEY,json);
    if(!alive)return;
    lastSuccess=partial?0:Date.now();
    update(assets,partial?'cached':'live');setStatus(partial?'Some folders are offline. Keeping available puppy artwork.':'Assets refreshed successfully.');
   }catch{if(alive)setStatus('Could not refresh online assets. Using cached or bundled artwork.');}
   finally{loading=false;if(alive)setRefreshing(false);}
  };
  const init=async()=>{
   try{
    const cached=await AsyncStorage.getItem(ROSTER_CACHE_KEY);
    if(cached&&alive){remote.current=parseCachedRoster(cached);update(remote.current,'cached');}
   }catch{/* Corrupt cache falls back to bundled registry. */}
   void refresh();
  };
  controls.current={refresh:()=>refresh(true),clearCache:async()=>{if(loading)return;try{await AsyncStorage.removeItem(ROSTER_CACHE_KEY);remote.current=[];update([],'bundled');lastAttempt=0;lastSuccess=0;setStatus('Roster metadata cache cleared. Bundled artwork remains available.');}catch{if(alive)setStatus('Unable to clear roster cache.');}}};
  void init();
  const timer=setInterval(()=>void refresh(),ROSTER_REFRESH_MS);
  const listener=AppState.addEventListener('change',status=>{if(status==='active')void refresh();});
  return ()=>{alive=false;lifetime.abort();clearInterval(timer);listener.remove();};
 },[]);
 return {...snapshot,refreshing,status,refresh:()=>controls.current.refresh?.(),clearCache:()=>controls.current.clearCache?.()};
}
