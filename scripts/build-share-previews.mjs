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
// The puppy dominates the transparent card; the brand stays a small corner mark.
export const PUPPY_FRAME=Object.freeze({width:995,height:606,left:180,top:11});
export const LOGO_FRAME=Object.freeze({size:122,left:24,top:480});
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
  .resize(LOGO_FRAME.size,LOGO_FRAME.size,{fit:"contain",withoutEnlargement:true,
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
   // Trim only transparent margins so the real pup fills more of the card.
   .trim({threshold:6})
   .resize(PUPPY_FRAME.width,PUPPY_FRAME.height,{fit:"contain",
    background:{r:0,g:0,b:0,alpha:0}})
   .ensureAlpha().png().toBuffer();
  // No background: the upper-left and remaining empty space stay alpha=0.
  await sharp({
   create:{width:SHARE_CARD_WIDTH,height:SHARE_CARD_HEIGHT,channels:4,
    background:{r:0,g:0,b:0,alpha:0}}
  })
   .composite([
    {input:puppyLayer,left:PUPPY_FRAME.left,top:PUPPY_FRAME.top},
    {input:logo,left:LOGO_FRAME.left,top:LOGO_FRAME.top}
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
