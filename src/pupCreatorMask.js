// Pure pixel operations shared by the creator and regression tests.
import {cleanRosterTemplate} from './creatorCleanTemplate.js';
export const TEMPLATE_VERSION=3;
export const TEMPLATES=Object.freeze({
 v1:Object.freeze({id:"classic",url:"/assets/creator/v1_roster.png",width:256,height:256}),
 v2:Object.freeze({id:"v2_honey",url:"/assets/creator/v2_roster.png",width:256,height:256})
});
export function validTemplateIdentity(generation,id,version){
 return Object.hasOwn(TEMPLATES,generation)&&((version===TEMPLATE_VERSION&&id===TEMPLATES[generation].id)||(version===2&&id==="creator_"+generation+"_clean")||(version===1&&id==="test_"+generation+"_crash_dummy"));
}
export function deriveTemplate(source,w,h,generation,version=TEMPLATE_VERSION){
 if(source.length!==w*h*4)throw Error("Invalid template pixels");
 const mask=new Uint8Array(w*h),barrier=new Uint8Array(w*h),outline=new Uint8ClampedArray(w*h*4);
 for(let i=0;i<mask.length;i++)mask[i]=source[i*4+3];
 if(!mask.some(a=>a===0)||!mask.some(a=>a>200))throw Error("Template lacks a transparent silhouette");
 if(generation!==undefined){
  if(version<3)return cleanRosterTemplate(mask,w,h,generation);
  const base=new Uint8ClampedArray(source);
  for(let i=0;i<mask.length;i++){
   if(!mask[i])continue;
   const k=i*4,x=i%w,y=Math.floor(i/w);
   base[k+3]=255;
   // Copy the exact dark ink geometry: ears, eyes, nose, mouth, paws,
   // body and tail. No coordinates, hand tracing, or fabricated details.
   const lum=.2126*source[k]+.7152*source[k+1]+.0722*source[k+2];
   const edge=x===0||y===0||x===w-1||y===h-1||[i-1,i+1,i-w,i+w].some(j=>mask[j]<32);
   const alpha=Math.max(edge?255:0,Math.round(255*Math.max(0,Math.min(1,(105-lum)/55))));
   if(alpha){outline.set([36,28,34,alpha],k);if(alpha>=96)barrier[i]=255;}
  }
  return {mask,outline,barrier,base};
 }
 const delta=(a,b)=>Math.max(...[0,1,2].map(k=>Math.abs(source[a*4+k]-source[b*4+k])));
 const dark=i=>source[i*4]*.2126+source[i*4+1]*.7152+source[i*4+2]*.0722<105;
 for(let i=0;i<mask.length;i++){
  if(!mask[i])continue;
  const x=i%w,y=Math.floor(i/w),neighbors=[x?i-1:-1,x<w-1?i+1:-1,y?i-w:-1,y<h-1?i+w:-1];
  const edge=neighbors.some(j=>j<0||mask[j]<32)||mask[i]<240;
  // Structural edges are extracted from dark source details, not a generic illustration.
  const detail=dark(i)&&neighbors.some(j=>j>=0&&mask[j]>128&&delta(i,j)>55);
  const strong=dark(i)&&neighbors.some(j=>j>=0&&mask[j]>128&&!dark(j));
  if(edge||detail||strong){outline.set([36,28,34,edge?255:220],i*4);barrier[i]=255;}
 }
 return {mask,outline,barrier};
}
export function constrainPixels(pixels,mask,final=false){
 if(pixels.length!==mask.length*4)throw Error("Invalid mask dimensions");
 const out=new Uint8ClampedArray(pixels);
 for(let i=0;i<mask.length;i++){
  if(!mask[i])out.fill(0,i*4,i*4+4);
  else if(final)out[i*4+3]=Math.round(out[i*4+3]*mask[i]/255);
 }
 return out;
}
export function floodRegion(pixels,w,h,mask,barrier,x,y,color,tolerance=18){
 const out=constrainPixels(pixels,mask),start=y*w+x;
 if(x<0||x>=w||y<0||y>=h||!mask[start]||barrier[start])return out;
 const old=Array.from(out.subarray(start*4,start*4+4)),seen=new Uint8Array(w*h),queue=new Int32Array(w*h);
 let head=0,tail=0;
 const add=i=>{
  if(i<0||i>=seen.length||seen[i]||!mask[i]||barrier[i])return;
  seen[i]=1;const j=i*4;
  if(old.every((v,k)=>Math.abs(out[j+k]-v)<=tolerance))queue[tail++]=i;
 };
 add(start);
 while(head<tail){const i=queue[head++];out.set(color,i*4);if(i%w)add(i-1);if(i%w<w-1)add(i+1);add(i-w);add(i+w);}
 return out;
}
