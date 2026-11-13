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
const THEMED_DIR=join(OUTPUT_DIR,'themes');
const THEME_RENDER_VERSION='contrast-outline-v1';
const THEME_MARKER=join(THEMED_DIR,'.theme-revision');
const SIZES=[32,64,96];
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
// CSS image cursors cannot be resized with CSS. Generate real raster variants
// from the canonical artwork, not an unrelated Classic Paw replacement.
function isPngSize(bytes,size){
 return bytes.length>24&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&
  bytes.toString('ascii',12,16)==='IHDR'&&bytes.readUInt32BE(16)===size&&bytes.readUInt32BE(20)===size;
}
async function themedCursor(original,theme){
 // The supplied dark/light images have similar orange/cyan colors. Enhance the
 // visible contrast without changing the original 64px Android assets.
 const mask=await sharp(original).ensureAlpha().extractChannel('alpha').dilate(2).png().toBuffer();
 const borderColor=theme==='dark'?'#081522':'#FFFFFF';
 const outline=await sharp({create:{width:64,height:64,channels:3,background:borderColor}})
  .joinChannel(mask).png().toBuffer();
 const artwork=await sharp(original).modulate(theme==='dark'
  ?{brightness:0.82,saturation:1.12}
  :{brightness:1.18,saturation:0.92}).png().toBuffer();
 return sharp(outline).composite([{input:artwork,blend:'over'}]).png().toBuffer();
}
async function generateThemedVariants(force){
 await mkdir(THEMED_DIR,{recursive:true});
 let needs=force;
 try{if((await readFile(THEME_MARKER,'utf8')).trim()!==SOURCE_REF+':'+THEME_RENDER_VERSION)needs=true;}
 catch{needs=true;}
 if(!needs){
  try{
   for(const theme of THEMES)for(const state of STATES)for(const size of SIZES){
    const file=join(THEMED_DIR,`puppy_pointer_${theme}_${state}_${size}.png`);
    if(!isPngSize(await readFile(file),size)){needs=true;break;}
   }
  }catch{needs=true;}
 }
 if(!needs)return;
 for(const theme of THEMES)for(const state of STATES){
  const file=join(OUTPUT_DIR,`puppy_pointer_${theme}_${state}.png`);
  const rendered=await themedCursor(await readFile(file),theme);
  await Promise.all(SIZES.map(async size=>{
   const target=join(THEMED_DIR,`puppy_pointer_${theme}_${state}_${size}.png`);
   await sharp(rendered).resize(size,size).png().toFile(target);
  }));
 }
 await writeFile(THEME_MARKER,SOURCE_REF+':'+THEME_RENDER_VERSION+'\n','utf8');
 console.log('Puppy cursor themes: enhanced dark/light contrast at 32, 64 and 96 px');
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
 await generateThemedVariants(!fresh);
}
await syncPuppyPointers();
