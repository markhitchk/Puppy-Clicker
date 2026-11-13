// Build-time copy of the original Android mouse cursor pack.
// Source: markhitchk/pup-clinker/Mobile/assets/pointers (same PNGs as Kotlin drawable-nodpi).
// Pin the revision so website, web app and Android use identical artwork.
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import sharp from 'sharp';

const SOURCE_REF='af9f32f8a545ab2a43dcc36917f8beae9ae7c56f';
const SOURCE_ROOT=`https://raw.githubusercontent.com/markhitchk/pup-clinker/${SOURCE_REF}/Mobile/assets/pointers`;
const OUTPUT_DIR=fileURLToPath(new URL('../public/assets/pointers/',import.meta.url));
const REVISION_FILE=join(OUTPUT_DIR,'.source-revision');
const SIZED_DIR=join(OUTPUT_DIR,'sizes');
const SIZES=[32,48,64,96];
const PAW_ROOT=fileURLToPath(new URL('../public/assets/cursors/',import.meta.url));
const PAW_STATE_ASSETS={default:'paw_default',hover:'paw_hover',click:'paw_click',text_select:'paw_text',link:'paw_link',grab:'paw_drag',grabbing:'paw_drag',not_allowed:'paw_disabled',working:'paw_default',precision:'paw_casino',alternate:'paw_default',secondary:'paw_default'};
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
function sizedName(name,size){return name.replace(/\.png$/,`_${size}.png`);}
function isPngSize(bytes,size){
 return bytes.length>24&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&
  bytes.toString('ascii',12,16)==='IHDR'&&bytes.readUInt32BE(16)===size&&bytes.readUInt32BE(20)===size;
}
async function needsSizedVariant(path,size,force){
 if(force)return true;
 try{return !isPngSize(await readFile(path),size);}catch{return true;}
}
async function generateSizedVariants(force){
 await mkdir(SIZED_DIR,{recursive:true});
 const jobs=[];
 // Preserve the original 64x64 PNGs unchanged; resize only generated copies.
 for(const name of NAMES)for(const size of SIZES){
  if(size===64)continue;
  const dest=join(SIZED_DIR,sizedName(name,size));
  jobs.push(async()=>{
   if(await needsSizedVariant(dest,size,force))
    await sharp(join(OUTPUT_DIR,name)).resize(size,size).png().toFile(dest);
  });
 }
 // Rasterized fallback art provides actual size selection for the legacy paw style.
 for(const [state,svgName] of Object.entries(PAW_STATE_ASSETS))for(const size of SIZES){
  const dest=join(SIZED_DIR,`paw_pointer_${state}_${size}.png`);
  jobs.push(async()=>{
   if(await needsSizedVariant(dest,size,force))
    await sharp(join(PAW_ROOT,svgName+'.svg'),{density:192}).resize(size,size).png().toFile(dest);
  });
 }
 for(let i=0;i<jobs.length;i+=8)await Promise.all(jobs.slice(i,i+8).map(job=>job()));
 console.log(`Puppy pointer sizes: ${SIZES.join('/') } px, original and paw styles ready`);
}
export async function syncPuppyPointers(){
 await mkdir(OUTPUT_DIR,{recursive:true});
 const fresh=await upToDate();
 if(!fresh){
  // Bounded concurrency avoids overloading the upstream repository.
  for(let index=0;index<NAMES.length;index+=6)
   await Promise.all(NAMES.slice(index,index+6).map(syncOne));
  await writeFile(REVISION_FILE,SOURCE_REF+'\n','utf8');
  console.log(`Puppy pointers: synced ${NAMES.length} original PNGs from pup-clinker@${SOURCE_REF.slice(0,12)}`);
 }
 await generateSizedVariants(!fresh);
}
await syncPuppyPointers();
