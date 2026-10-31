// Opaque, crawler-friendly social cards featuring each puppy's real artwork.
// The generated background prevents messaging apps from flattening PNG alpha to black.
import sharp from "sharp";
import {mkdir,readFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import {join} from "node:path";
import roster from "../src/data/roster.js";
import {PUPPY_IMAGES} from "../src/native/src/assets/puppies.js";
import {LEGACY_V6_PUPPIES} from "../src/native/src/engine/rosterV6.js";
import {puppyAssetId} from "../src/puppyLinks.js";

const ROOT=fileURLToPath(new URL("../",import.meta.url));
const OUT=join(ROOT,"public/assets/share");
export const SHARE_CARD_VERSION="v1";
const published=new Map(roster.map(p=>[p.id,p]));
const details=new Map(LEGACY_V6_PUPPIES.map(p=>[p.id,p]));
export const sharePuppies=[...new Set([...published.keys(),...Object.keys(PUPPY_IMAGES)])]
 .map(id=>{
  const p=published.get(id)||{id};
  return {...p,id,name:details.get(id)?.name||p.name||id,image:p.image||PUPPY_IMAGES[id]?.uri};
 }).filter(p=>Boolean(p.image));

export function shareCardPath(puppy){
 return "/assets/share/"+puppyAssetId(puppy)+"-"+SHARE_CARD_VERSION+".jpg";
}

const xml=value=>String(value).replace(/&/g,"&amp;").replace(/</g,"&lt;")
 .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");

function palette(group){
 if(group==="v2")return ["#121A38","#333769","#9C6EDF","#8FE9FC"];
 if(group==="discord_rewards"||group==="discord")return ["#20143F","#493074","#A477E7","#9DE9FF"];
 if(group==="test")return ["#141A31","#34375D","#9275C6","#79ECF8"];
 return ["#1B1A42","#4B306F","#B67EDB","#8FE5FC"];
}

function backgroundSvg(puppy){
 const [dark,mid,pink,cyan]=palette(puppy.group);
 const size=puppy.name.length>20?44:puppy.name.length>14?55:puppy.name.length>9?65:81;
 const category=puppy.group==="v1"?"V1 COLLECTION":puppy.group==="v2"?"V2 COLLECTION":
  puppy.group==="test"?"TEST PUPPY":puppy.group==="discord_rewards"?"COMMUNITY PUPPY":"SPECIAL PUPPY";
 // Brand labels remain left of the original puppy art, which appears at right.
 return [
  '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">',
  '<defs><linearGradient id="sky" x1="0%" y1="0%" x2="100%" y2="100%">',
  '<stop stop-color="'+dark+'"/><stop offset="55%" stop-color="'+mid+'"/>',
  '<stop offset="100%" stop-color="'+pink+'"/></linearGradient>',
  '<radialGradient id="halo"><stop stop-color="#F2FAFF" stop-opacity=".43"/>',
  '<stop offset=".6" stop-color="'+cyan+'" stop-opacity=".18"/>',
  '<stop offset="1" stop-color="'+cyan+'" stop-opacity="0"/></radialGradient></defs>',
  '<rect width="1200" height="630" fill="url(#sky)"/>',
  '<circle cx="888" cy="306" r="347" fill="url(#halo)"/>',
  '<circle cx="893" cy="318" r="274" fill="#FFFFFF" fill-opacity=".07" stroke="#FFFFFF" stroke-opacity=".19" stroke-width="2"/>',
  '<ellipse cx="894" cy="574" rx="232" ry="26" fill="#0B1234" fill-opacity=".3"/>',
  '<path d="M0 555Q290 493 530 543T1200 529V630H0Z" fill="#141B40" fill-opacity=".3"/>',
  '<g fill="#FFFFFF" opacity=".73"><circle cx="75" cy="199" r="3"/><circle cx="420" cy="110" r="2"/>',
  '<circle cx="552" cy="176" r="3"/><circle cx="1120" cy="95" r="3"/>',
  '<circle cx="1030" cy="522" r="3"/></g>',
  '<g stroke="#D8F9FF" stroke-width="4" stroke-linecap="round" opacity=".85">',
  '<path d="M570 79v24M558 91h24"/><path d="M1112 234v28M1098 248h28"/>',
  '<path d="M490 421v24M478 433h24"/></g>',
  '<g fill="'+cyan+'" opacity=".7"><ellipse cx="96" cy="97" rx="9" ry="12"/>',
  '<ellipse cx="118" cy="97" rx="9" ry="12"/><ellipse cx="81" cy="75" rx="7" ry="9"/>',
  '<ellipse cx="103" cy="70" rx="7" ry="9"/><ellipse cx="124" cy="75" rx="7" ry="9"/></g>',
  '<g font-family="Arial, Helvetica, sans-serif">',
  '<text x="159" y="111" font-size="37" font-weight="bold" fill="#FFFFFF">Puppy Clicker</text>',
  '<text x="83" y="244" font-size="23" font-weight="bold" letter-spacing="3" fill="'+cyan+'">MEET THE PUPPIES</text>',
  '<text x="81" y="350" font-size="'+size+'" font-weight="bold" fill="#FFFFFF">'+xml(puppy.name)+'</text>',
  '<rect x="85" y="389" width="280" height="53" rx="26" fill="#FFFFFF" fill-opacity=".15" stroke="#FFFFFF" stroke-opacity=".35"/>',
  '<text x="106" y="423" font-size="23" font-weight="bold" fill="#FFFFFF">'+category+'</text>',
  '<text x="85" y="511" font-size="27" fill="#F1EFFF">Tap · Collect · Care</text>',
  '<text x="85" y="584" font-size="20" fill="#D0DCF6">puppy-clicker.vercel.app</text>',
  '</g></svg>'
 ].join("");
}

export async function buildSharePreviews(){
 await mkdir(OUT,{recursive:true});
 let count=0;
 for(const puppy of sharePuppies){
  // Build-time transparency cleanup removes the original V1 black matte.
  // The puppy artwork itself is unchanged, and its alpha is composited on sky.
  const artPath=/^\/assets\/(v1|v2)\//.test(puppy.image)
   ?puppy.image.replace("/assets/","/assets/transparent/")
   :puppy.image;
  const source=join(ROOT,"public",artPath.slice(1));
  const artwork=await readFile(source);
  const puppyLayer=await sharp(artwork).resize(554,480,{
   fit:"contain",background:{r:0,g:0,b:0,alpha:0},withoutEnlargement:true
  }).png().toBuffer();
  await sharp(Buffer.from(backgroundSvg(puppy)))
   .composite([{input:puppyLayer,left:604,top:90}])
   .flatten({background:"#30244D"})
   .jpeg({quality:88,mozjpeg:true})
   .toFile(join(ROOT,"public",shareCardPath(puppy).slice(1)));
  count++;
 }
 return count;
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===join(process.cwd(),"scripts/build-share-previews.mjs")){
 const count=await buildSharePreviews();
 console.log("Generated "+count+" Puppy Clicker 1200x630 JPEG share cards.");
}
