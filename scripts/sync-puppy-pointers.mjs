// Build-time copy of the original Android mouse cursor pack.
// Source: markhitchk/pup-clinker/Mobile/assets/pointers (same PNGs as Kotlin drawable-nodpi).
// Pin the revision so website, web app and Android use identical artwork.
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join,dirname} from 'node:path';

const SOURCE_REF='af9f32f8a545ab2a43dcc36917f8beae9ae7c56f';
const SOURCE_ROOT=`https://raw.githubusercontent.com/markhitchk/pup-clinker/${SOURCE_REF}/Mobile/assets/pointers`;
const OUTPUT_DIR=fileURLToPath(new URL('../public/assets/pointers/',import.meta.url));
const REVISION_FILE=join(OUTPUT_DIR,'.source-revision');
const THEMES=['dark','light'];
const STATES=['default','hover','click','text_select','link','grab','grabbing','not_allowed','working','precision','alternate','secondary'];
const NAMES=THEMES.flatMap(theme=>STATES.map(state=>`puppy_pointer_${theme}_${state}.png`));

function isPng64(bytes){
 return bytes.length>24 &&
  bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) &&
  bytes.toString('ascii',12,16)==='IHDR' &&
  bytes.readUInt32BE(16)===64 && bytes.readUInt32BE(20)===64;
}
async function upToDate(){
 try{
  if((await readFile(REVISION_FILE,'utf8')).trim()!==SOURCE_REF)return false;
  for(const name of NAMES)if(!isPng64(await readFile(join(OUTPUT_DIR,name))))return false;
  return true;
 }catch{return false;}
}
async function syncOne(name){
 const url=`${SOURCE_ROOT}/${name}`;
 const response=await fetch(url,{signal:AbortSignal.timeout(25000)});
 if(!response.ok)throw new Error(`Puppy pointer sync: HTTP ${response.status} for ${name}`);
 const bytes=Buffer.from(await response.arrayBuffer());
 if(!isPng64(bytes))throw new Error(`Puppy pointer sync: invalid 64x64 PNG ${name}`);
 await writeFile(join(OUTPUT_DIR,name),bytes);
}
export async function syncPuppyPointers(){
 await mkdir(OUTPUT_DIR,{recursive:true});
 if(await upToDate())return;
 // Bounded concurrency avoids overloading the upstream repository.
 for(let index=0;index<NAMES.length;index+=6)
  await Promise.all(NAMES.slice(index,index+6).map(syncOne));
 await writeFile(REVISION_FILE,SOURCE_REF+'\\n','utf8');
 console.log(`Puppy pointers: synced ${NAMES.length} original PNGs from pup-clinker@${SOURCE_REF.slice(0,12)}`);
}
await syncPuppyPointers();
