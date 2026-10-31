// Social previews use only the real puppy PNG and official site logo.
// Preserve transparency; never bake in a themed background or solid matte.
import sharp from "sharp";
import {mkdir,readFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import {join} from "node:path";
import roster from "../src/data/roster.js";
import {PUPPY_IMAGES} from "../src/native/src/assets/puppies.js";
import {shareCardPath,SHARE_CARD_WIDTH,SHARE_CARD_HEIGHT} from "../src/puppyShareCard.js";

const ROOT=fileURLToPath(new URL("../",import.meta.url));
const OUT=join(ROOT,"public/assets/share");
const LOGO=join(ROOT,"public/assets/logos/puppy_clicker.png");
const published=new Map(roster.map(p=>[p.id,p]));
export const sharePuppies=[...new Set([...published.keys(),...Object.keys(PUPPY_IMAGES)])]
 .map(id=>{
  const p=published.get(id)||{id};
  return {...p,id,image:p.image||PUPPY_IMAGES[id]?.uri};
 }).filter(p=>Boolean(p.image));

export async function buildSharePreviews(){
 await mkdir(OUT,{recursive:true});
 // The exact logo already used by the website, not a recreated brand graphic.
 const logo=await sharp(await readFile(LOGO))
  .resize(350,350,{fit:"contain",withoutEnlargement:true,
   background:{r:0,g:0,b:0,alpha:0}})
  .ensureAlpha().png().toBuffer();
 let count=0;
 for(const puppy of sharePuppies){
  // Use the same artwork as the roster; V1/V2 matte cleanup retains the
  // original puppy and replaces only its surrounding black source background.
  const imagePath=/^\/assets\/(v1|v2)\//.test(puppy.image)
   ?puppy.image.replace("/assets/","/assets/transparent/")
   :puppy.image;
  const artwork=await readFile(join(ROOT,"public",imagePath.slice(1)));
  const puppyLayer=await sharp(artwork)
   .resize(570,550,{fit:"contain",withoutEnlargement:true,
    background:{r:0,g:0,b:0,alpha:0}})
   .ensureAlpha().png().toBuffer();
  // No background: the upper-left and remaining empty space stay alpha=0.
  await sharp({
   create:{width:SHARE_CARD_WIDTH,height:SHARE_CARD_HEIGHT,channels:4,
    background:{r:0,g:0,b:0,alpha:0}}
  })
   .composite([
    {input:logo,left:88,top:140},
    {input:puppyLayer,left:594,top:37}
   ])
   .png({compressionLevel:9,palette:false})
   .toFile(join(ROOT,"public",shareCardPath(puppy).slice(1)));
  count++;
 }
 return count;
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===join(process.cwd(),"scripts/build-share-previews.mjs")){
 const count=await buildSharePreviews();
 console.log("Generated "+count+" transparent Puppy Clicker logo + puppy PNG share cards.");
}
