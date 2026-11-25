import React,{useEffect,useRef,useState} from "react";
import "./PupCreator.css";
import {CreatorSubmit} from "./CreatorSubmissions.jsx";
import "./PupCreator.mobile.css";
import {TEMPLATES,TEMPLATE_VERSION,deriveTemplate,constrainPixels,floodRegion,validTemplateIdentity} from "./pupCreatorMask.js";

const SIZE=256, LIMIT=12, MAX_LAYERS=8, DRAFT="pup-creator-draft-v2";
const makeCanvas=()=>Object.assign(document.createElement("canvas"),{width:SIZE,height:SIZE});
const context=c=>c.getContext("2d",{willReadFrequently:true});
const pixels=c=>context(c).getImageData(0,0,SIZE,SIZE);
const setPixels=(c,data)=>context(c).putImageData(new ImageData(new Uint8ClampedArray(data),SIZE,SIZE),0,0);
const pngPattern=/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/;
const newLayer=(name="Paint")=>({id:crypto.randomUUID(),name,visible:true,opacity:1,canvas:makeCanvas()});
const tools=[["brush","Brush"],["soft","Soft brush"],["pencil","Pencil"],["eraser","Eraser"],["fill","Fill"],["picker","Eyedropper"],["line","Line"],["rectangle","Rectangle"],["ellipse","Ellipse"],["text","Text"]];
const palette=["#20202b","#ffffff","#b97b50","#f4c98d","#7a4635","#a8a9b8","#ed497b","#ffb640","#46c9a0","#52a8ff","#9c73ff","#fd6c39"];
function loadImage(src){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error("Could not load artwork"));img.src=src;});}
function drawFit(ctx,img){const k=Math.min(SIZE/img.width,SIZE/img.height);const w=img.width*k,h=img.height*k;ctx.drawImage(img,(SIZE-w)/2,(SIZE-h)/2,w,h);}
function download(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function slug(name){return name.trim().toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"").slice(0,64)||"custom_puppy";}
export default function PupCreator({initialGeneration="v1"}){
 const canvas=useRef(null),stroke=useRef(null),history=useRef([]),index=useRef(-1),loadId=useRef(0),fileInput=useRef(null),template=useRef(null),layers=useRef([]),active=useRef(null),dirty=useRef(false);
 const [guide,setGuide]=useState(0),[tolerance,setTolerance]=useState(18),[autosave,setAutosave]=useState(false);
 const [generation,setGeneration]=useState(initialGeneration),[tool,setTool]=useState("brush"),[color,setColor]=useState("#ed497b"),[size,setSize]=useState(18),[opacity,setOpacity]=useState(100),[mirror,setMirror]=useState(false),[zoom,setZoom]=useState(100),[shapeFill,setShapeFill]=useState(false),[text,setText]=useState(""),[name,setName]=useState(""),[description,setDescription]=useState(""),[ready,setReady]=useState(false),[status,setStatus]=useState("Loading canvas…"),[revision,setRevision]=useState(0),[background,setBackground]=useState("checker");
 const selected=()=>layers.current.find(l=>l.id===active.current);
 const ctx=()=>context(selected().canvas);
 const capture=()=>pixels(selected().canvas);
 const render=(target=canvas.current,reference=guide)=>{
  if(!template.current||!target)return;
  const c=context(target);c.clearRect(0,0,SIZE,SIZE);
  for(const l of layers.current){if(!l.visible)continue;c.save();c.globalAlpha=l.opacity;c.drawImage(l.canvas,0,0);c.restore();}
  if(reference>0){c.save();c.globalAlpha=reference/100;c.drawImage(template.current.original,0,0);c.restore();}
  c.drawImage(template.current.outlineCanvas,0,0);
  setPixels(target,constrainPixels(pixels(target).data,template.current.mask,true));
 };
 const clip=()=>{const l=selected();if(l&&template.current)setPixels(l.canvas,constrainPixels(pixels(l.canvas).data,template.current.mask));};
 const snapshot=()=>({active:active.current,layers:layers.current.map(({canvas,...meta})=>({...meta,data:pixels(canvas).data}))});
 const checkpoint=()=>{clip();history.current=history.current.slice(0,index.current+1);history.current.push(snapshot());if(history.current.length>LIMIT)history.current.shift();index.current=history.current.length-1;dirty.current=true;render();setRevision(v=>v+1);};
 const resetHistory=()=>{history.current=[];index.current=-1;checkpoint();dirty.current=false;};
 const restore=delta=>{if(!ready||stroke.current)return;const i=index.current+delta;if(i<0||i>=history.current.length)return;index.current=i;const snap=history.current[i];layers.current=snap.layers.map(({data,...meta})=>{const c=makeCanvas();setPixels(c,data);return {...meta,canvas:c};});active.current=snap.active;dirty.current=true;render();setRevision(v=>v+1);};
 const buildTemplate=async g=>{
  const spec=TEMPLATES[g];if(!spec)throw Error("Unknown template");
  const img=await loadImage(spec.url);if(img.naturalWidth!==spec.width||img.naturalHeight!==spec.height)throw Error("Template dimensions changed");
  const original=makeCanvas();context(original).drawImage(img,0,0,SIZE,SIZE);
  const data=pixels(original).data,derived=deriveTemplate(data,SIZE,SIZE,g),outlineCanvas=makeCanvas();
  setPixels(outlineCanvas,derived.outline);
  // Original roster colors at full support alpha; final compositor applies source alpha once.
  const full=derived.base;
  setPixels(original,full);return {...derived,original,outlineCanvas,generation:g};
 };
 const loadTemplate=async(g,force=false)=>{
  if(stroke.current)return;
  if(!force&&dirty.current&&!window.confirm("Switch template and discard unsaved artwork?"))return;
  const id=++loadId.current;setReady(false);setStatus("Loading canvas…");
  try{const t=await buildTemplate(g);if(id!==loadId.current||!canvas.current)return;
   template.current=t;layers.current=[newLayer()];active.current=layers.current[0].id;setGeneration(g);setName("");setDescription("");setGuide(0);resetHistory();render(canvas.current,0);setReady(true);setStatus("Canvas ready");
  }catch{if(id===loadId.current){setStatus("Template unavailable or missing a transparent silhouette.");setReady(false);}}
 };
 useEffect(()=>{void loadTemplate(initialGeneration,true);return()=>{loadId.current++;};},[initialGeneration]);
 useEffect(()=>{if(ready)render();},[guide,ready]);
 const addLayer=()=>{if(!ready||stroke.current||layers.current.length>=MAX_LAYERS)return;const l=newLayer("Paint "+(layers.current.length+1));layers.current.push(l);active.current=l.id;checkpoint();};
 const editLayer=(id,patch)=>{if(stroke.current)return;const l=layers.current.find(x=>x.id===id);if(!l)return;Object.assign(l,patch);checkpoint();};
 const removeLayer=()=>{if(stroke.current||layers.current.length<=1||!window.confirm("Delete this paint layer?"))return;layers.current=layers.current.filter(l=>l.id!==active.current);active.current=layers.current.at(-1).id;checkpoint();};
 const duplicateLayer=()=>{const l=selected();if(!l||stroke.current||layers.current.length>=MAX_LAYERS)return;const copy=newLayer((l.name+" copy").slice(0,60));context(copy.canvas).drawImage(l.canvas,0,0);copy.opacity=l.opacity;copy.visible=l.visible;layers.current.splice(layers.current.indexOf(l)+1,0,copy);active.current=copy.id;checkpoint();};
 const moveLayer=delta=>{if(stroke.current)return;const i=layers.current.findIndex(l=>l.id===active.current),j=i+delta;if(i<0||j<0||j>=layers.current.length)return;[layers.current[i],layers.current[j]]=[layers.current[j],layers.current[i]];checkpoint();};
 const originalColors=()=>{if(!ready||stroke.current)return;const l=selected();if(!l||!window.confirm("Replace the selected paint layer with clean base colors?"))return;ctx().clearRect(0,0,SIZE,SIZE);ctx().drawImage(template.current.original,0,0);checkpoint();};
 useEffect(()=>{const handler=e=>{if(e.target instanceof HTMLElement&&(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||e.target.isContentEditable))return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="z"){e.preventDefault();restore(e.shiftKey?1:-1);}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="y"){e.preventDefault();restore(1);}};window.addEventListener("keydown",handler);return()=>window.removeEventListener("keydown",handler);},[ready,revision]);
 const point=e=>{const r=canvas.current.getBoundingClientRect();return {x:Math.max(0,Math.min(SIZE-1,(e.clientX-r.left)*SIZE/r.width)),y:Math.max(0,Math.min(SIZE-1,(e.clientY-r.top)*SIZE/r.height)),pressure:e.pointerType==="pen"?Math.max(.15,e.pressure||.5):1};};
 const both=(a,b,fn)=>{fn(a,b);if(mirror)fn({...a,x:SIZE-1-a.x},{...b,x:SIZE-1-b.x});};
 const setup=(c,erase=false)=>{c.globalCompositeOperation=erase?"destination-out":"source-over";c.globalAlpha=opacity/100;c.strokeStyle=color;c.fillStyle=color;c.lineCap="round";c.lineJoin="round";if(tool==="soft"&&!erase){c.shadowColor=color;c.shadowBlur=Math.max(1,size/2);c.globalAlpha*=.45;}};
 const paint=(a,b)=>{const c=ctx();c.save();setup(c,tool==="eraser");c.lineWidth=(tool==="pencil"?Math.min(size,4):size)*b.pressure;
  both(a,b,(p,q)=>{c.beginPath();if(p.x===q.x&&p.y===q.y){c.arc(q.x,q.y,c.lineWidth/2,0,Math.PI*2);c.fill();}else{c.moveTo(p.x,p.y);c.lineTo(q.x,q.y);c.stroke();}});c.restore();};
 const shape=(a,b)=>{const c=ctx();c.save();setup(c);c.lineWidth=size;both(a,b,(p,q)=>{c.beginPath();if(tool==="line"){c.moveTo(p.x,p.y);c.lineTo(q.x,q.y);}else if(tool==="rectangle")c.rect(p.x,p.y,q.x-p.x,q.y-p.y);else c.ellipse((p.x+q.x)/2,(p.y+q.y)/2,Math.max(.1,Math.abs(q.x-p.x)/2),Math.max(.1,Math.abs(q.y-p.y)/2),0,0,Math.PI*2);if(shapeFill&&tool!=="line")c.fill();else c.stroke();});c.restore();};
 const down=e=>{if(!ready||stroke.current||e.button!==0||!selected()?.visible)return;e.preventDefault();const p=point(e),c=ctx();
  if(tool==="picker"){const d=context(canvas.current).getImageData(Math.floor(p.x),Math.floor(p.y),1,1).data;setColor("#"+Array.from(d.slice(0,3),v=>v.toString(16).padStart(2,"0")).join(""));setTool("brush");return;}
  if(tool==="fill"){const t=template.current,col=[parseInt(color.slice(1,3),16),parseInt(color.slice(3,5),16),parseInt(color.slice(5,7),16),Math.round(opacity*2.55)];const fill=x=>setPixels(selected().canvas,floodRegion(capture().data,SIZE,SIZE,t.mask,t.barrier,Math.floor(x),Math.floor(p.y),col,tolerance));fill(p.x);if(mirror)fill(SIZE-1-p.x);checkpoint();return;}
  if(tool==="text"){if(!text.trim())return;c.save();setup(c);c.font=Math.max(10,size*2)+"px sans-serif";c.textBaseline="top";c.fillText(text.slice(0,80),p.x,p.y);c.restore();checkpoint();return;}
  canvas.current.setPointerCapture(e.pointerId);stroke.current={id:e.pointerId,start:p,last:p,before:capture(),shape:["line","rectangle","ellipse"].includes(tool)};if(!stroke.current.shape)paint(p,p);render();
 };
 const move=e=>{const s=stroke.current;if(!s||s.id!==e.pointerId)return;const p=point(e);if(s.shape){ctx().putImageData(s.before,0,0);shape(s.start,p);}else paint(s.last,p);s.last=p;render();};
 const finish=(e,cancel=false)=>{const s=stroke.current;if(!s||s.id!==e.pointerId)return;stroke.current=null;if(cancel){ctx().putImageData(s.before,0,0);render();return;}if(s.shape){ctx().putImageData(s.before,0,0);shape(s.start,point(e));}checkpoint();};
 const blank=()=>{if(!ready||stroke.current||!window.confirm("Clear selected paint layer?"))return;ctx().clearRect(0,0,SIZE,SIZE);checkpoint();setStatus("Canvas ready");};
 const finalCanvas=()=>{const target=makeCanvas();render(target,0);return target;};
 const pack=()=>({format:"puppy-clicker.pup",version:2,generation,sourceTemplateId:TEMPLATES[generation].id,templateVersion:TEMPLATE_VERSION,name:name.trim().slice(0,80)||"Custom Puppy",description:description.trim().slice(0,240),width:SIZE,height:SIZE,layers:layers.current.map(({canvas,...meta})=>({...meta,artwork:canvas.toDataURL("image/png")})),artwork:finalCanvas().toDataURL("image/png")});
 useEffect(()=>{const handler=e=>{if(dirty.current){e.preventDefault();e.returnValue="";}};window.addEventListener("beforeunload",handler);return()=>window.removeEventListener("beforeunload",handler);},[]);
 useEffect(()=>{if(!autosave||!ready||!dirty.current)return;const timer=setTimeout(()=>{try{localStorage.setItem(DRAFT,JSON.stringify(pack()));setStatus("Draft autosaved on this device");}catch{setStatus("Autosave failed. Export a .pup to keep your artwork.");}},900);return()=>clearTimeout(timer);},[autosave,ready,revision,name,description,generation]);
 const exportPup=()=>download(new Blob([JSON.stringify(pack())],{type:"application/json"}),slug(name)+".pup");
 const exportPng=()=>finalCanvas().toBlob(blob=>{if(blob)download(blob,slug(name)+".png");},"image/png");
 const importPack=async value=>{
  if(stroke.current)throw Error("Finish drawing before importing");
  if(!value||value.format!=="puppy-clicker.pup"||![1,2].includes(value.version)||!Object.hasOwn(TEMPLATES,value.generation)||typeof value.name!=="string"||value.name.length>80||typeof value.description!=="string"||value.description.length>240)throw Error("Invalid puppy package");
  const legacy=value.version===1,expected=legacy?512:SIZE;
  if(value.width!==expected||value.height!==expected||(!legacy&&(!validTemplateIdentity(value.generation,value.sourceTemplateId,value.templateVersion))))throw Error("Invalid template or dimensions");
  const entries=legacy?[{id:"legacy",name:"Imported artwork",visible:true,opacity:1,artwork:value.artwork}]:value.layers;
  if(!Array.isArray(entries)||!entries.length||entries.length>MAX_LAYERS)throw Error("Invalid layer count");
  const oldTemplate=legacy||value.templateVersion<TEMPLATE_VERSION;
  if(oldTemplate&&!window.confirm("This project uses an older puppy outline. Import its paint layers onto the actual roster template? Artwork outside the new silhouette will be clipped."))return;
  const t=await buildTemplate(value.generation),next=[],ids=new Set();
  for(const l of entries){
   if(!l||typeof l.id!=="string"||l.id.length>80||ids.has(l.id)||typeof l.name!=="string"||l.name.length>60||typeof l.visible!=="boolean"||!Number.isFinite(l.opacity)||l.opacity<0||l.opacity>1||typeof l.artwork!=="string"||l.artwork.length>2_000_000||!pngPattern.test(l.artwork))throw Error("Invalid paint layer");
   ids.add(l.id);const img=await loadImage(l.artwork);if(img.naturalWidth!==expected||img.naturalHeight!==expected)throw Error("Invalid artwork dimensions");
   const layer={id:l.id,name:l.name,visible:l.visible,opacity:l.opacity,canvas:makeCanvas()};
   context(layer.canvas).drawImage(img,0,0,SIZE,SIZE);setPixels(layer.canvas,constrainPixels(pixels(layer.canvas).data,t.mask));next.push(layer);
  }
  if(!canvas.current)return;if(dirty.current&&!window.confirm("Replace unsaved artwork with this project?"))return;
  loadId.current++;template.current=t;layers.current=next;active.current=next.at(-1).id;setGeneration(value.generation);setName(value.name);setDescription(value.description);setGuide(0);resetHistory();render(canvas.current,0);setReady(true);setStatus(oldTemplate?"Older artwork imported onto the actual roster outline":"Puppy package imported");
 };
 const importFile=async e=>{const file=e.target.files?.[0];e.target.value="";if(!file)return;try{if(file.size>10_000_000)throw Error("File exceeds 10 MB");if(file.name.toLowerCase().endsWith(".pup")){await importPack(JSON.parse(await file.text()));return;}if(!["image/png","image/jpeg","image/webp"].includes(file.type))throw Error("Use PNG, JPEG, WebP or .pup");if(!ready||stroke.current||!selected()?.visible)throw Error("Select a visible paint layer first");const url=URL.createObjectURL(file);try{const img=await loadImage(url);if(img.width*img.height>16000000)throw Error("Image exceeds 16 megapixels");if(stroke.current||!ready)return;drawFit(ctx(),img);checkpoint();setStatus("Image imported and clipped");}finally{URL.revokeObjectURL(url);}}catch(err){setStatus(err.message||"Import failed");}};
 const saveDraft=()=>{try{localStorage.setItem(DRAFT,JSON.stringify(pack()));dirty.current=false;setStatus("Draft saved on this device");}catch{setStatus("Could not save draft. Export a .pup instead.");}};
 const loadDraft=async()=>{try{const raw=localStorage.getItem(DRAFT)||localStorage.getItem("pup-creator-draft-v1");if(!raw)throw Error("No saved draft on this device");await importPack(JSON.parse(raw));}catch(err){setStatus(err.message||"Could not restore draft");}};
 const deleteDraft=()=>{if(window.confirm("Delete the locally saved draft?")){setAutosave(false);localStorage.removeItem(DRAFT);localStorage.removeItem("pup-creator-draft-v1");setStatus("Local draft deleted");}};
 return <section className="pup-creator landing" aria-label="Pup Creator Studio">
  <header className="pc-heading"><div><p className="pc-kicker">COMMUNITY CREATIONS</p><h1>Pup Creator Studio</h1><p>Paint directly on the original Classic V1 or Honey V2 roster puppy outline.</p></div><div className="pc-actions"><button disabled={!ready} onClick={saveDraft}>Save draft</button><button onClick={loadDraft}>Restore draft</button><button onClick={deleteDraft}>Delete draft</button><button disabled={!ready} onClick={exportPup}>Export .pup</button><button disabled={!ready} onClick={exportPng}>Export PNG</button></div></header>
  <div className="pc-layout">
   <aside className="pc-panel pc-tools"><h2>Tools</h2><div className="pc-tool-grid">{tools.map(([id,label])=><button key={id} aria-pressed={tool===id} onClick={()=>setTool(id)}>{label}</button>)}</div>
    <label>Color <input type="color" value={color} onChange={e=>setColor(e.target.value)}/></label><div className="pc-palette">{palette.map(c=><button key={c} aria-label={"Color "+c} aria-pressed={c===color} style={{background:c}} onClick={()=>setColor(c)}/>)}</div>
    <label>Brush size · {size}px<input type="range" min="1" max="100" value={size} onChange={e=>setSize(+e.target.value)}/></label>
    <label>Opacity · {opacity}%<input type="range" min="5" max="100" value={opacity} onChange={e=>setOpacity(+e.target.value)}/></label>
    {tool==="fill"&&<label>Fill tolerance · {tolerance}<input type="range" min="0" max="100" value={tolerance} onChange={e=>setTolerance(+e.target.value)}/></label>}
    <label className="pc-check"><input type="checkbox" checked={mirror} onChange={e=>setMirror(e.target.checked)}/> Horizontal symmetry</label>
    <label className="pc-check"><input type="checkbox" checked={shapeFill} onChange={e=>setShapeFill(e.target.checked)}/> Filled shapes</label>
    {tool==="text"&&<label>Text to stamp<input maxLength={80} value={text} onChange={e=>setText(e.target.value)}/></label>}
   </aside>
   <div className="pc-workspace"><div className="pc-actions"><button onClick={()=>loadTemplate("v1")} aria-pressed={generation==="v1"}>V1 template</button><button onClick={()=>loadTemplate("v2")} aria-pressed={generation==="v2"}>V2 template</button><button disabled={!ready} onClick={blank}>Clear paint</button><button disabled={!ready} onClick={originalColors}>Base colors</button><button disabled={!ready} onClick={()=>{if(window.confirm("Reset this puppy template and discard current artwork?"))loadTemplate(generation,true);}}>Reset template</button><button disabled={!ready||index.current<1} onClick={()=>restore(-1)}>Undo</button><button disabled={!ready||index.current>=history.current.length-1} onClick={()=>restore(1)}>Redo</button></div>
    <div className="pc-viewport"><div className={"pc-artboard pc-bg-"+background} style={{width:zoom+"%",maxWidth:zoom===100?"512px":undefined}}><canvas width={SIZE} height={SIZE} ref={canvas} aria-label="Puppy artwork" onPointerDown={down} onPointerMove={move} onPointerUp={e=>finish(e)} onPointerCancel={e=>finish(e,true)} onLostPointerCapture={e=>finish(e,true)}/></div></div>
    <div className="pc-actions"><label>Reference {guide}% <input type="range" min="0" max="70" value={guide} onChange={e=>setGuide(+e.target.value)}/></label><label>Zoom {zoom}% <input type="range" min="50" max="200" step="25" value={zoom} onChange={e=>setZoom(+e.target.value)}/></label><button onClick={()=>setZoom(100)}>Fit canvas</button><label>Preview background <select value={background} onChange={e=>setBackground(e.target.value)}><option value="checker">Transparency</option><option value="dark">Dark</option><option value="light">Light</option></select></label></div>
    <p role="status" className="pc-status">{status}</p>
   </div>
   <aside className="pc-panel pc-details"><h2>Layers</h2><p>🔒 Protected outline · always exported</p><div className="pc-layer-list">{[...layers.current].reverse().map(l=><div className="pc-layer" key={l.id}><button aria-pressed={active.current===l.id} onClick={()=>{if(!stroke.current){active.current=l.id;setRevision(v=>v+1);}}}>{l.name}</button><button aria-label={(l.visible?"Hide ":"Show ")+l.name} onClick={()=>editLayer(l.id,{visible:!l.visible})}>{l.visible?"◉":"○"}</button></div>)}</div>{selected()&&<><label>Layer name<input maxLength={60} value={selected().name} onChange={e=>editLayer(active.current,{name:e.target.value})}/></label><label>Layer opacity · {Math.round(selected().opacity*100)}%<input type="range" min="0" max="100" value={Math.round(selected().opacity*100)} onChange={e=>editLayer(active.current,{opacity:+e.target.value/100})}/></label></>}<div className="pc-actions"><button disabled={!ready||layers.current.length>=MAX_LAYERS} onClick={addLayer}>Add layer</button><button disabled={!ready||layers.current.length>=MAX_LAYERS} onClick={duplicateLayer}>Duplicate</button><button disabled={!ready||layers.current.length<=1} onClick={removeLayer}>Delete layer</button><button disabled={!ready} onClick={()=>moveLayer(1)}>Move up</button><button disabled={!ready} onClick={()=>moveLayer(-1)}>Move down</button></div><h2>Artwork</h2><label className="pc-check"><input type="checkbox" checked={autosave} onChange={e=>setAutosave(e.target.checked)}/> Autosave locally</label><label>Puppy name<input value={name} maxLength={80} onChange={e=>{setName(e.target.value);dirty.current=true;}} placeholder="Name your puppy"/></label><label>Description<textarea rows={4} maxLength={240} value={description} onChange={e=>{setDescription(e.target.value);dirty.current=true;}} placeholder="Tell us about your design"/></label><p>Generation: <strong>{generation.toUpperCase()}</strong> · 256 × 256 PNG</p><button onClick={()=>fileInput.current.click()}>Import artwork or .pup</button><input hidden ref={fileInput} type="file" accept=".pup,image/png,image/jpeg,image/webp" onChange={importFile}/><p>All drawing and imports are clipped to the official silhouette. The reference guide is preview-only. The protected outline cannot be erased.</p><CreatorSubmit pack={pack} ready={ready}/></aside>
  </div>
 </section>;
}
