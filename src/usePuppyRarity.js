import {useEffect,useState} from 'react';
import {client} from './supabase.js';
export function usePuppyRarity(){
 const [catalog,setCatalog]=useState({rows:[],loading:true,error:false});
 useEffect(()=>{
  let alive=true, request=0;
  async function refresh(){
   const current=++request;
   try{
    const {data,error}=await client.rpc('pup_rarity_public');
    if(error||!Array.isArray(data))throw Error('Catalog unavailable');
    if(alive&&request===current)setCatalog({rows:data,loading:false,error:false});
   }catch{if(alive&&request===current)setCatalog({rows:[],loading:false,error:true});}
  }
  void refresh();
  window.addEventListener('focus',refresh);
  return ()=>{alive=false;window.removeEventListener('focus',refresh);};
 },[]);
 return catalog;
}
