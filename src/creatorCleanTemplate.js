// Hand-traced structural features registered to the original 256px V1/V2
// roster silhouettes. Crash-test graphics are intentionally not sampled.
const v1=[
 ["M",85,38,"C",78,48,77,64,73,79,"C",70,91,67,97,61,100],
 ["M",166,38,"C",176,50,177,69,181,83,"C",184,94,188,99,193,102],
 ["M",93,74,"Q",98,69,104,74],["M",150,74,"Q",155,69,161,74],
 ["M",126,113,"L",126,118,"C",122,130,110,127,106,119],
 ["M",126,118,"C",131,130,143,127,146,119],
 ["M",88,139,"Q",125,157,164,139],
 ["M",88,146,"Q",126,165,166,146],
 ["M",91,150,"Q",79,174,87,202,"L",86,209],
 ["M",112,159,"Q",108,179,117,196,"Q",123,201,126,203],
 ["M",145,165,"Q",135,184,134,205,"Q",130,211,126,215],
 ["M",160,152,"Q",178,160,190,184,"Q",199,202,193,220],
 ["M",160,180,"Q",174,171,184,182],
 ["M",153,212,"Q",168,202,183,212],
 ["M",87,209,"Q",105,201,117,217],["M",126,215,"Q",141,204,156,216],
 ["M",94,220,"Q",91,225,92,231],["M",104,220,"Q",102,226,103,232],
 ["M",133,222,"Q",130,227,131,233],["M",144,222,"Q",142,229,143,233],
 ["M",165,220,"Q",162,226,163,231],["M",175,220,"Q",172,226,173,231],
 ["M",188,183,"Q",202,174,199,151]
];
const v2=[
 ["M",81,29,"C",72,39,71,60,64,78,"Q",60,89,52,91],
 ["M",165,30,"C",176,45,176,64,185,78,"Q",190,89,197,90],
 ["M",88,66,"Q",93,61,99,65],["M",145,65,"Q",151,60,157,66],
 ["M",122,109,"L",122,113,"C",118,124,105,124,102,115],
 ["M",122,113,"C",127,125,138,124,142,115],
 ["M",80,130,"Q",120,151,170,129],
 ["M",80,137,"Q",121,157,173,138],
 ["M",84,139,"Q",71,145,76,153,"L",72,159,"Q",80,169,80,194,"L",77,208],
 ["M",105,153,"Q",99,168,108,181,"L",112,194,"Q",119,201,124,203],
 ["M",147,159,"Q",137,176,134,200,"Q",131,212,124,217],
 ["M",166,139,"Q",182,151,190,169,"Q",209,196,199,224],
 ["M",158,180,"Q",174,170,186,181],
 ["M",153,219,"Q",170,209,188,222],
 ["M",78,208,"Q",99,200,113,219],["M",124,217,"Q",141,207,156,222],
 ["M",85,221,"Q",82,228,83,236],["M",96,221,"Q",93,228,94,237],
 ["M",131,225,"Q",128,232,129,239],["M",142,225,"Q",139,233,140,239],
 ["M",165,226,"Q",162,233,163,238],["M",177,226,"Q",174,232,175,237],
 ["M",190,168,"Q",185,159,183,154,"Q",197,155,206,166,"Q",216,181,211,198]
];
const features={v1:{paths:v1,eyes:[[98,93,8,10],[155,93,8,10]],nose:[126,107,10,6]},v2:{paths:v2,eyes:[[93,87,8,11],[151,87,8,11]],nose:[122,103,10,6]}};
export function cleanRosterTemplate(mask,w,h,generation){
 if(w!==256||h!==256||!features[generation])throw Error("Unsupported creator template");
 const outline=new Uint8ClampedArray(w*h*4),barrier=new Uint8Array(w*h),base=new Uint8ClampedArray(w*h*4);
 const set=(x,y,a)=>{if(x<0||y<0||x>=w||y>=h)return;const i=y*w+x;if(!mask[i])return;const alpha=Math.round(255*Math.min(1,Math.max(0,a)));if(alpha>outline[i*4+3])outline.set([36,28,34,alpha],i*4);if(alpha>=96)barrier[i]=255;};
 const segment=(x1,y1,x2,y2,r=1.2)=>{
  const dx=x2-x1,dy=y2-y1,d=dx*dx+dy*dy;
  for(let y=Math.floor(Math.min(y1,y2)-r-1);y<=Math.ceil(Math.max(y1,y2)+r+1);y++)for(let x=Math.floor(Math.min(x1,x2)-r-1);x<=Math.ceil(Math.max(x1,x2)+r+1);x++){
   const t=d?Math.max(0,Math.min(1,((x+.5-x1)*dx+(y+.5-y1)*dy)/d)):0;
   set(x,y,r+.5-Math.hypot(x+.5-x1-t*dx,y+.5-y1-t*dy));
  }
 };
 const path=commands=>{let x=0,y=0;for(let i=0;i<commands.length;){const op=commands[i++];if(op==="M"){x=commands[i++];y=commands[i++];continue;}const startX=x,startY=y;let points;
  if(op==="L")points=[commands[i++],commands[i++]];
  else if(op==="Q")points=[commands[i++],commands[i++],commands[i++],commands[i++]];
  else points=[commands[i++],commands[i++],commands[i++],commands[i++],commands[i++],commands[i++]];
  const n=op==="L"?1:24;
  for(let j=1;j<=n;j++){const t=j/n,u=1-t;let nx,ny;if(op==="L"){[nx,ny]=points;}else if(op==="Q"){nx=u*u*startX+2*u*t*points[0]+t*t*points[2];ny=u*u*startY+2*u*t*points[1]+t*t*points[3];}else{nx=u*u*u*startX+3*u*u*t*points[0]+3*u*t*t*points[2]+t*t*t*points[4];ny=u*u*u*startY+3*u*u*t*points[1]+3*u*t*t*points[3]+t*t*t*points[5];}segment(x,y,nx,ny);x=nx;y=ny;}
 }};
 const oval=(cx,cy,rx,ry)=>{let x=cx+rx,y=cy;for(let j=1;j<=64;j++){const t=j*Math.PI*2/64,nx=cx+rx*Math.cos(t),ny=cy+ry*Math.sin(t);segment(x,y,nx,ny,1.25);x=nx;y=ny;}};
 // Keep the exact original alpha silhouette; create one smooth boundary,
 // never sample crash-target colors, bands, crosshairs or dashed marks.
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;if(!mask[i])continue;base.set([249,232,204,255],i*4);
  let distance=4;for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=w||yy>=h||mask[yy*w+xx]<32)distance=Math.min(distance,Math.hypot(dx,dy));}
  if(mask[i]<240)set(x,y,1);else set(x,y,2.25-distance);
 }
 const f=features[generation];f.paths.forEach(path);f.eyes.forEach(([x,y,rx,ry])=>{oval(x,y,rx,ry);oval(x+2,y-3,2.2,2.2);});oval(...f.nose);
 return {mask,outline,barrier,base};
}
