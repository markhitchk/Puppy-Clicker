import {TEMPLATES,TEMPLATE_VERSION,deriveTemplate,constrainPixels,validTemplateIdentity} from "../../src/pupCreatorMask.js";
export const MAX_BODY=3_800_000;
const pattern=/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/;
const clean=(x,max,min=0)=>{if(typeof x!=="string"||x.length>max||x.trim().length<min||/[\u0000-\u001f\u007f]/.test(x))throw Error("INVALID_TEXT");return x.trim();};
const png=x=>{if(typeof x!=="string"||x.length>400000||!pattern.test(x))throw Error("INVALID_PNG");const b=Buffer.from(x.slice(22),"base64");if(b.length<29||b.subarray(0,8).toString("hex")!=="89504e470d0a1a0a"||b.toString("ascii",12,16)!=="IHDR"||b.readUInt32BE(16)!==256||b.readUInt32BE(20)!==256)throw Error("INVALID_DIMENSIONS");return x;};
export function validateCreatorPackage(p){
 if(!p||typeof p!=="object"||p.format!=="puppy-clicker.pup"||p.version!==2||!Object.hasOwn(TEMPLATES,p.generation)||!validTemplateIdentity(p.generation,p.sourceTemplateId,p.templateVersion)||p.width!==256||p.height!==256||!Array.isArray(p.layers)||p.layers.length<1||p.layers.length>8)throw Error("INVALID_PACKAGE");
 const ids=new Set(),layers=p.layers.map(l=>{const id=clean(l?.id,80,1);if(ids.has(id)||typeof l.visible!=="boolean"||!Number.isFinite(l.opacity)||l.opacity<0||l.opacity>1)throw Error("INVALID_LAYER");ids.add(id);return {id,name:clean(l.name,60,1),visible:l.visible,opacity:l.opacity,artwork:png(l.artwork)};});
 return {format:p.format,version:2,generation:p.generation,sourceTemplateId:p.sourceTemplateId,templateVersion:p.templateVersion,width:256,height:256,name:clean(p.name,80,1),description:clean(p.description,240,1),layers};
}
const dataUri=b=>"data:image/png;base64,"+b.toString("base64");
export async function sanitizeCreatorPackage(input,sharp,templateBytes){
 const p=validateCreatorPackage(input),size=256,options={width:size,height:size,channels:4},decode=async b=>{
  const x=sharp(b,{limitInputPixels:65536,failOn:"warning"});const meta=await x.metadata();
  if(meta.format!=="png"||meta.width!==size||meta.height!==size||(meta.pages??1)!==1)throw Error("INVALID_PNG");
  const result=await x.ensureAlpha().toColourspace("srgb").raw().toBuffer();if(result.length!==size*size*4)throw Error("INVALID_PIXELS");return new Uint8ClampedArray(result);
 };
 const encode=async p=>sharp(Buffer.from(p),{raw:options}).png().toBuffer();
 const t=deriveTemplate(await decode(templateBytes),size,size,p.generation),stack=[];
 for(const l of p.layers){const pixels=constrainPixels(await decode(Buffer.from(l.artwork.slice(22),"base64")),t.mask);const encoded=await encode(pixels);l.artwork=dataUri(encoded);
  if(l.visible){for(let i=3;i<pixels.length;i+=4)pixels[i]=Math.round(pixels[i]*l.opacity);stack.push({input:await encode(pixels)});}
 }
 stack.push({input:await encode(t.outline)});
 const base=await sharp({create:{width:size,height:size,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(stack).raw().toBuffer();
 p.sourceTemplateId=TEMPLATES[p.generation].id;p.templateVersion=TEMPLATE_VERSION;
 p.artwork=dataUri(await encode(constrainPixels(base,t.mask,true)));return p;
}
