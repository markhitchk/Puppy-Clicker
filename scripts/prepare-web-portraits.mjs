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
 const urls={fallback};
 for(const [name,width] of [['small',256],['large',640]]){
  const filename=`${id}-${hash}-${width}.webp`;
  const portrait=await sharp(bytes).resize(width,width,{fit:'inside',withoutEnlargement:true}).webp({quality:85,effort:4}).toBuffer();
  await writeFile(new URL(filename,output),portrait);
  urls[name]='/assets/portraits/'+filename;
  if(name==='small')after+=portrait.length;
 }
 before+=bytes.length;manifest[id]=urls;
}
await writeFile(new URL('src/native/web/portraitManifest.json',root),JSON.stringify(manifest));
console.log(`Prepared ${Object.keys(manifest).length} web portraits: ${(before/1024/1024).toFixed(1)} MB originals → ${(after/1024).toFixed(0)} KB thumbnails.`);
