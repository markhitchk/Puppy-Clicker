import {ROSTER_INDEX_URL,ROSTER_ASSET_URL,ROSTER_INDEX_MAX_BYTES,ROSTER_MANIFEST_MAX_BYTES,ROSTER_MAX_REMOTE,parseRosterIndex,parseRosterManifest,validateRemoteRoster} from '../src/engine/dynamicRoster.js';

// A broken folder must not erase previously downloaded puppies from that folder.
// Keep a small concurrency limit so a growing catalog cannot flood mobile connections.
export async function loadRosterCatalog({getText,previous=[],signal}){
 const folders=parseRosterIndex(await getText(ROSTER_INDEX_URL,ROSTER_INDEX_MAX_BYTES));
 if(folders.length>50)throw Error('Too many roster folders');
 const batches=new Array(folders.length);
 let cursor=0,partial=false;
 async function worker(){
  while(cursor<folders.length){
   signal?.throwIfAborted();
   const index=cursor++,folder=folders[index];
   try{batches[index]=parseRosterManifest(folder,await getText(ROSTER_ASSET_URL+'/'+folder+'/manifest.json',ROSTER_MANIFEST_MAX_BYTES));}
   catch(error){
    if(signal?.aborted)throw error;
    partial=true;batches[index]=previous.filter(p=>p.folder===folder);
   }
  }
 }
 await Promise.all(Array.from({length:Math.min(4,folders.length)},worker));
 signal?.throwIfAborted();
 const assets=batches.flat();
 if(assets.length>ROSTER_MAX_REMOTE)throw Error('Roster capacity exceeded');
 validateRemoteRoster(assets);
 return {assets,partial};
}
