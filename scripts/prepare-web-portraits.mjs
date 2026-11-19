import sharp from 'sharp';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {PUPPY_IMAGES} from '../src/native/src/assets/puppies.js';

const root=new URL('../',import.meta.url),output=new URL('public/assets/portraits/',root);
await mkdir(output,{recursive:true});
const manifest={};
let before=0,after=0;
for(const [id,{uri}] of Object.entries(PUPPY_IMAGES)){
 const fallback=/^\/assets\/(v1|v2)\//.test(uri)?uri.replace('/assets/','/assets/transparent/'):uri;
 let bytes;
 try{bytes=await readFile(new URL('public'+fallback,root));}catch(error){if(error.code==='ENOENT')continue;throw error;}
 if(!bytes.length)continue;
 const hash=createHash('sha256').update(bytes).digest('hex').slice(0,12);
 const original=await sharp(bytes).metadata();
 const urls={fallback,originalWidth:original.width,originalHeight:original.height};
 // Every advertised srcSet width must match the generated image's real width.
 // Previously low-resolution originals were left at 256px and incorrectly
 // advertised as 640w, causing blurry artwork on high-density displays.
 for(const [name,width] of [['small',256],['large',640],['full',1536]]){
  const filename=`${id}-${hash}-${width}.webp`;
  let pipeline=sharp(bytes).resize(width,width,{fit:'inside',kernel:'lanczos3'});
  if(width>Math.max(original.width,original.height))pipeline=pipeline.sharpen({sigma:0.8});
  const portrait=await pipeline.webp({
   quality:name==='small'?85:name==='large'?93:96,
   alphaQuality:100,effort:4
  }).toBuffer();
  const rendered=await sharp(portrait).metadata();
  await writeFile(new URL(filename,output),portrait);
  urls[name]='/assets/portraits/'+filename;
  urls[name+'Width']=rendered.width;
  if(name==='small')after+=portrait.length;
 }
 before+=bytes.length;manifest[id]=urls;
}
await writeFile(new URL('src/native/web/portraitManifest.json',root),JSON.stringify(manifest));
console.log(`Prepared ${Object.keys(manifest).length} web portraits: ${(before/1024/1024).toFixed(1)} MB originals → ${(after/1024).toFixed(0)} KB thumbnails.`);
