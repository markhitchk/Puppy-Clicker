import React,{useEffect,useRef,useState} from "react";
import "./PupCreator.css";

const SIZE=512, LIMIT=24, DRAFT="pup-creator-draft-v1";
const templates={v1:"/assets/test/v1_test_crash_dummy.png",v2:"/assets/test/v2_test_crash_dummy.png"};
const tools=[["brush","Brush"],["pencil","Pencil"],["eraser","Eraser"],["fill","Fill"],["picker","Eyedropper"],["line","Line"],["rectangle","Rectangle"],["ellipse","Ellipse"],["text","Text"]];
const palette=["#20202b","#ffffff","#b97b50","#f4c98d","#7a4635","#a8a9b8","#ed497b","#ffb640","#46c9a0","#52a8ff","#9c73ff","#fd6c39"];
function loadImage(src){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error("Could not load artwork"));img.src=src;});}
function drawFit(ctx,img){const k=Math.min(SIZE/img.width,SIZE/img.height);const w=img.width*k,h=img.height*k;ctx.drawImage(img,(SIZE-w)/2,(SIZE-h)/2,w,h);}
function download(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function slug(name){return name.trim().toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"").slice(0,64)||"custom_puppy";}
function fillAt(ctx,x,y,color){
 const img=ctx.getImageData(0,0,SIZE,SIZE),d=img.data, start=(y*SIZE+x)*4;
 const old=Array.from(d.subarray(start,start+4)),next=[parseInt(color.slice(1,3),16),parseInt(color.slice(3,5),16),parseInt(color.slice(5,7),16),255];
 if(old.every((v,i)=>v===next[i]))return;
 const seen=new Uint8Array(SIZE*SIZE),queue=new Int32Array(SIZE*SIZE);let head=0,tail=0;
 const add=i=>{if(i<0||i>=seen.length||seen[i])return;seen[i]=1;const j=i*4;if(old.every((v,k)=>Math.abs(d[j+k]-v)<=18))queue[tail++]=i;};
 add(y*SIZE+x);
 while(head<tail){const i=queue[head++],j=i*4;d.set(next,j);if(i%SIZE)add(i-1);if(i%SIZE<SIZE-1)add(i+1);add(i-SIZE);add(i+SIZE);}
 ctx.putImageData(img,0,0);
}
export default function PupCreator(){
 const canvas=useRef(null),stroke=useRef(null),history=useRef([]),index=useRef(-1),loadId=useRef(0),fileInput=useRef(null);
 const [generation,setGeneration]=useState("v1"),[tool,setTool]=useState("brush"),[color,setColor]=useState("#ed497b"),[size,setSize]=useState(18),[opacity,setOpacity]=useState(100),[mirror,setMirror]=useState(false),[zoom,setZoom]=useState(100),[shapeFill,setShapeFill]=useState(false),[text,setText]=useState(""),[name,setName]=useState(""),[description,setDescription]=useState(""),[ready,setReady]=useState(false),[status,setStatus]=useState("Loading canvas…"),[revision,setRevision]=useState(0),[background,setBackground]=useState("checker");
 const ctx=()=>canvas.current.getContext("2d",{willReadFrequently:true});
 const capture=()=>ctx().getImageData(0,0,SIZE,SIZE);
 const checkpoint=()=>{history.current=history.current.slice(0,index.current+1);history.current.push(capture());if(history.current.length>LIMIT)history.current.shift();index.current=history.current.length-1;setRevision(v=>v+1);};
 const resetHistory=()=>{history.current=[];index.current=-1;checkpoint();};
 const restore=delta=>{if(!ready||stroke.current)return;const i=index.current+delta;if(i<0||i>=history.current.length)return;index.current=i;ctx().putImageData(history.current[i],0,0);setRevision(v=>v+1);};
 const loadTemplate=async g=>{
  const id=++loadId.current;stroke.current=null;setReady(false);setStatus("Loading canvas…");
  try{const img=await loadImage(templates[g]);if(id!==loadId.current||!canvas.current)return;
   ctx().clearRect(0,0,SIZE,SIZE);drawFit(ctx(),img);setGeneration(g);resetHistory();setReady(true);setStatus("Canvas ready");
  }catch{if(id===loadId.current){setStatus("Template unavailable. Choose another template.");setReady(false);}}
 };
 useEffect(()=>{void loadTemplate("v1");return()=>{loadId.current++;};},[]);
 useEffect(()=>{const handler=e=>{if(e.target instanceof HTMLElement&&(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||e.target.isContentEditable))return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="z"){e.preventDefault();restore(e.shiftKey?1:-1);}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="y"){e.preventDefault();restore(1);}};window.addEventListener("keydown",handler);return()=>window.removeEventListener("keydown",handler);},[ready,revision]);
 const point=e=>{const r=canvas.current.getBoundingClientRect();return {x:Math.max(0,Math.min(SIZE-1,(e.clientX-r.left)*SIZE/r.width)),y:Math.max(0,Math.min(SIZE-1,(e.clientY-r.top)*SIZE/r.height)),pressure:e.pointerType==="pen"?Math.max(.15,e.pressure||.5):1};};
 const both=(a,b,fn)=>{fn(a,b);if(mirror)fn({...a,x:SIZE-1-a.x},{...b,x:SIZE-1-b.x});};
 const setup=(c,erase=false)=>{c.globalCompositeOperation=erase?"destination-out":"source-over";c.globalAlpha=opacity/100;c.strokeStyle=color;c.fillStyle=color;c.lineCap="round";c.lineJoin="round";};
 const paint=(a,b)=>{const c=ctx();c.save();setup(c,tool==="eraser");c.lineWidth=(tool==="pencil"?Math.min(size,4):size)*b.pressure;
  both(a,b,(p,q)=>{c.beginPath();if(p.x===q.x&&p.y===q.y){c.arc(q.x,q.y,c.lineWidth/2,0,Math.PI*2);c.fill();}else{c.moveTo(p.x,p.y);c.lineTo(q.x,q.y);c.stroke();}});c.restore();};
 const shape=(a,b)=>{const c=ctx();c.save();setup(c);c.lineWidth=size;both(a,b,(p,q)=>{c.beginPath();if(tool==="line"){c.moveTo(p.x,p.y);c.lineTo(q.x,q.y);}else if(tool==="rectangle")c.rect(p.x,p.y,q.x-p.x,q.y-p.y);else c.ellipse((p.x+q.x)/2,(p.y+q.y)/2,Math.max(.1,Math.abs(q.x-p.x)/2),Math.max(.1,Math.abs(q.y-p.y)/2),0,0,Math.PI*2);if(shapeFill&&tool!=="line")c.fill();else c.stroke();});c.restore();};
 const down=e=>{if(!ready||stroke.current||e.button!==0)return;e.preventDefault();const p=point(e),c=ctx();
  if(tool==="picker"){const d=c.getImageData(Math.floor(p.x),Math.floor(p.y),1,1).data;setColor("#"+Array.from(d.slice(0,3),v=>v.toString(16).padStart(2,"0")).join(""));setTool("brush");return;}
  if(tool==="fill"){fillAt(c,Math.floor(p.x),Math.floor(p.y),color);if(mirror)fillAt(c,Math.floor(SIZE-1-p.x),Math.floor(p.y),color);checkpoint();return;}
  if(tool==="text"){if(!text.trim())return;c.save();setup(c);c.font=Math.max(10,size*2)+"px sans-serif";c.textBaseline="top";c.fillText(text.slice(0,80),p.x,p.y);c.restore();checkpoint();return;}
  canvas.current.setPointerCapture(e.pointerId);stroke.current={id:e.pointerId,start:p,last:p,before:capture(),shape:["line","rectangle","ellipse"].includes(tool)};if(!stroke.current.shape)paint(p,p);
 };
 const move=e=>{const s=stroke.current;if(!s||s.id!==e.pointerId)return;const p=point(e);if(s.shape){ctx().putImageData(s.before,0,0);shape(s.start,p);}else paint(s.last,p);s.last=p;};
 const finish=(e,cancel=false)=>{const s=stroke.current;if(!s||s.id!==e.pointerId)return;stroke.current=null;if(cancel){ctx().putImageData(s.before,0,0);return;}if(s.shape){ctx().putImageData(s.before,0,0);shape(s.start,point(e));}checkpoint();};
 const blank=()=>{if(!ready)return;ctx().clearRect(0,0,SIZE,SIZE);checkpoint();setStatus("Canvas ready");};
 const pack=()=>({format:"puppy-clicker.pup",version:1,generation,name:name.trim().slice(0,80)||"Custom Puppy",description:description.trim().slice(0,240),width:SIZE,height:SIZE,artwork:canvas.current.toDataURL("image/png")});
 const exportPup=()=>download(new Blob([JSON.stringify(pack())],{type:"application/json"}),slug(name)+".pup");
 const exportPng=()=>canvas.current.toBlob(blob=>{if(blob)download(blob,slug(name)+".png");},"image/png");
 const importPack=async value=>{if(!value||value.format!=="puppy-clicker.pup"||value.version!==1||!Object.hasOwn(templates,value.generation)||value.width!==SIZE||value.height!==SIZE||typeof value.artwork!=="string"||value.artwork.length>2_000_000||!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(value.artwork)||typeof value.name!=="string"||value.name.length>80||typeof value.description!=="string"||value.description.length>240)throw Error("Invalid puppy package");
  const img=await loadImage(value.artwork);if(img.width!==SIZE||img.height!==SIZE)throw Error("Invalid artwork dimensions");if(!canvas.current)return;loadId.current++;stroke.current=null;ctx().clearRect(0,0,SIZE,SIZE);ctx().drawImage(img,0,0);setGeneration(value.generation);setName(value.name);setDescription(value.description);resetHistory();setReady(true);setStatus("Puppy package imported");
 };
 const importFile=async e=>{const file=e.target.files?.[0];e.target.value="";if(!file)return;try{if(file.size>5_000_000)throw Error("File exceeds 5 MB");if(file.name.toLowerCase().endsWith(".pup")){await importPack(JSON.parse(await file.text()));return;}if(!["image/png","image/jpeg","image/webp"].includes(file.type))throw Error("Use PNG, JPEG, WebP or .pup");if(!ready)throw Error("Load a canvas first");const url=URL.createObjectURL(file);try{const img=await loadImage(url);if(img.width*img.height>16000000)throw Error("Image exceeds 16 megapixels");drawFit(ctx(),img);checkpoint();setStatus("Image imported");}finally{URL.revokeObjectURL(url);}}catch(err){setStatus(err.message||"Import failed");}};
 const saveDraft=()=>{try{localStorage.setItem(DRAFT,JSON.stringify(pack()));setStatus("Draft saved on this device");}catch{setStatus("Could not save draft. Export a .pup instead.");}};
 const loadDraft=async()=>{try{const raw=localStorage.getItem(DRAFT);if(!raw)throw Error("No saved draft on this device");await importPack(JSON.parse(raw));}catch(err){setStatus(err.message||"Could not restore draft");}};
 return <section className="pup-creator landing" aria-label="Pup Creator Studio">
  <header className="pc-heading"><div><p className="pc-kicker">COMMUNITY CREATIONS</p><h1>Pup Creator Studio</h1><p>Paint the original V1 or V2 test puppy, or create something completely new.</p></div><div className="pc-actions"><button disabled={!ready} onClick={saveDraft}>Save draft</button><button onClick={loadDraft}>Restore draft</button><button disabled={!ready} onClick={exportPup}>Export .pup</button><button disabled={!ready} onClick={exportPng}>Export PNG</button></div></header>
  <div className="pc-layout">
   <aside className="pc-panel pc-tools"><h2>Tools</h2><div className="pc-tool-grid">{tools.map(([id,label])=><button key={id} aria-pressed={tool===id} onClick={()=>setTool(id)}>{label}</button>)}</div>
    <label>Color <input type="color" value={color} onChange={e=>setColor(e.target.value)}/></label><div className="pc-palette">{palette.map(c=><button key={c} aria-label={"Color "+c} aria-pressed={c===color} style={{background:c}} onClick={()=>setColor(c)}/>)}</div>
    <label>Brush size · {size}px<input type="range" min="1" max="100" value={size} onChange={e=>setSize(+e.target.value)}/></label>
    <label>Opacity · {opacity}%<input type="range" min="5" max="100" value={opacity} onChange={e=>setOpacity(+e.target.value)}/></label>
    <label className="pc-check"><input type="checkbox" checked={mirror} onChange={e=>setMirror(e.target.checked)}/> Horizontal symmetry</label>
    <label className="pc-check"><input type="checkbox" checked={shapeFill} onChange={e=>setShapeFill(e.target.checked)}/> Filled shapes</label>
    {tool==="text"&&<label>Text to stamp<input maxLength={80} value={text} onChange={e=>setText(e.target.value)}/></label>}
   </aside>
   <div className="pc-workspace"><div className="pc-actions"><button onClick={()=>loadTemplate("v1")} aria-pressed={generation==="v1"}>V1 template</button><button onClick={()=>loadTemplate("v2")} aria-pressed={generation==="v2"}>V2 template</button><button disabled={!ready} onClick={blank}>Blank canvas</button><button disabled={!ready||index.current<1} onClick={()=>restore(-1)}>Undo</button><button disabled={!ready||index.current>=history.current.length-1} onClick={()=>restore(1)}>Redo</button></div>
    <div className="pc-viewport"><div className={"pc-artboard pc-bg-"+background} style={{width:zoom+"%",maxWidth:zoom===100?"512px":undefined}}><canvas width={SIZE} height={SIZE} ref={canvas} aria-label="Puppy artwork" onPointerDown={down} onPointerMove={move} onPointerUp={finish} onPointerCancel={e=>finish(e,true)} onLostPointerCapture={e=>finish(e,true)}/></div></div>
    <div className="pc-actions"><label>Zoom {zoom}% <input type="range" min="50" max="200" step="25" value={zoom} onChange={e=>setZoom(+e.target.value)}/></label><label>Preview background <select value={background} onChange={e=>setBackground(e.target.value)}><option value="checker">Transparency</option><option value="dark">Dark</option><option value="light">Light</option></select></label></div>
    <p role="status" className="pc-status">{status}</p>
   </div>
   <aside className="pc-panel pc-details"><h2>Artwork</h2><label>Puppy name<input value={name} maxLength={80} onChange={e=>setName(e.target.value)} placeholder="Name your puppy"/></label><label>Description<textarea rows={4} maxLength={240} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Tell us about your design"/></label><p>Generation: <strong>{generation.toUpperCase()}</strong> · 512 × 512 PNG</p><button onClick={()=>fileInput.current.click()}>Import artwork or .pup</button><input hidden ref={fileInput} type="file" accept=".pup,image/png,image/jpeg,image/webp" onChange={importFile}/><p>Exports preserve transparency. Imported images are placed over the current canvas. Templates start a fresh editing history.</p><h2>Community submissions</h2><p>Export your .pup to share for review. Official roster publication is not enabled in this editor.</p></aside>
  </div>
 </section>;
}
