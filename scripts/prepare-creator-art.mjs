// Normalize actual unmarked roster artwork once; both browser and API consume
// exactly the same PNG. No manually drawn geometry or crash-dummy RGB.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import sharp from 'sharp';
import {makeLegacyBackgroundTransparent} from './prepare-puppy-art.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
export const rosterSources={v1:'v1/v1_classic.png',v2:'v2/v2_honey.png'};
export async function prepareCreatorArt(){
 const output=join(root,'public/assets/creator');
 await mkdir(output,{recursive:true});
 for(const [generation,path] of Object.entries(rosterSources)){
  const source=makeLegacyBackgroundTransparent(await readFile(join(root,'public/assets',path)));
  const {data,info}=await sharp(source).ensureAlpha().toColourspace('srgb').raw().toBuffer({resolveWithObject:true});
  // Remove only the cyan ground shadow below the puppy, not any dog pixels.
  // Both selected source puppies have warm brown/cream fur and dark brown ink.
  for(let y=Math.floor(info.height*.75);y<info.height;y++)for(let x=0;x<info.width;x++){
   const i=(y*info.width+x)*4,r=data[i],g=data[i+1],b=data[i+2];
   if(g>r+8&&b>r+8&&Math.abs(g-b)<45)data.fill(0,i,i+4);
  }
  const raster=await sharp(data,{raw:{width:info.width,height:info.height,channels:4}}).resize(256,256,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();
  await writeFile(join(output,generation+'_roster.png'),raster);
  console.log('Creator template:',generation,path);
 }
}
await prepareCreatorArt();
