import React,{useEffect,useState} from "react";
import "./styles/shared/press.css";

const SITE="https://puppy-clicker.vercel.app";
const CONTACT="harleytg.hq@gmail.com";
const SHORT="Puppy Clicker is an incremental puppy-collecting game by Harley's Studios. Tap to earn Treats, unlock new companions, care for your pups and grow your collection.";
const LONG="Puppy Clicker combines incremental progression with virtual pet care and collectible puppies. Earn Treats by tapping, invest in upgrades, feed and play with your companions, complete goals and discover rewards. Explore the PupDex, choose your active puppy and build your collection across V1 and V2. The browser version offers a guest demo; full gameplay uses a verified Pup Account and eligible linked progress. Puppy-themed minigames use virtual game currencies, not real-money prizes.";
const FACTS=[["Game","Puppy Clicker"],["Developer & publisher","Harley's Studios"],["Genre","Incremental / virtual pet / collection"],["Platform","Web browser; Android companion"],["Access","Free browser demo; account requirements apply to full gameplay"],["Website",SITE],["Studio contact",CONTACT]];
const FEATURES=[
 ["🍪","Tap & upgrade","Earn Treats, increase tapping power and build your in-game economy."],
 ["🐾","Collect companions","Discover V1 and V2 puppies and explore the PupDex."],
 ["💖","Care for your pups","Feed, play, rest and bond with your companions."],
 ["🎁","Goals & rewards","Complete daily goals, unlock rewards and discover upgrades."],
 ["🏆","Progression","Build your collection, earn achievements and explore prestige."],
 ["🛡️","PupEye","Fair-play and server-side account and gameplay protection."]
];
const MEDIA=[
 {name:"Puppy Clicker",kind:"Official game logo",url:"/assets/logos/puppy_clicker.png",file:"puppy-clicker-logo.png"},
 {name:"Harley's Studios",kind:"Official studio logo",url:"/assets/logos/harleys_studios.png",file:"harleys-studios-logo.png"},
 {name:"PupEye",kind:"Fair-play brand logo",url:"/assets/logos/PupEye.png",file:"pupeye-logo.png"},
 {name:"Buddy / Classic",kind:"Original character artwork",url:"/assets/transparent/v1/v1_classic.png",file:"buddy-classic.png"},
 {name:"Sunny",kind:"Original character artwork",url:"/assets/transparent/v1/v1_golden.png",file:"sunny.png"},
 {name:"Mochi",kind:"Original character artwork",url:"/assets/transparent/v1/v1_poodle.png",file:"mochi.png"},
 {name:"Pepper",kind:"Original character artwork",url:"/assets/transparent/v1/v1_spotty.png",file:"pepper.png"}
];
const GUIDELINES="Credit Puppy Clicker and Harley's Studios in coverage. Preserve the proportions and colors of logos and artwork. Do not imply endorsement or use the assets to impersonate the game or studio. Contact Harley's Studios for usage questions. All rights reserved.";
const factSheet=()=>["PUPPY CLICKER — PRESS KIT","",...FACTS.map(([k,v])=>k+": "+v),"","SHORT DESCRIPTION",SHORT,"","FULL DESCRIPTION",LONG,"","KEY FEATURES",...FEATURES.map(([,name,detail])=>name+": "+detail),"","MEDIA GUIDELINES",GUIDELINES,"","Press kit: "+SITE+"/press"].join("\n");
function saveBlob(blob,name){
 const url=URL.createObjectURL(blob);
 const a=document.createElement("a");
 a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),30000);
}
function crc32(bytes){
 let crc=0xffffffff;
 for(const b of bytes){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
 return (crc^0xffffffff)>>>0;
}
// Standard ZIP store method; preserves the exact PNG bytes, with no external library.
function zipFiles(files){
 const encoder=new TextEncoder(),local=[],central=[];
 let offset=0,centralSize=0;
 for(const {name,bytes} of files){
  const filename=encoder.encode(name),crc=crc32(bytes);
  const head=new Uint8Array(30+filename.length),h=new DataView(head.buffer);
  h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x800,true);
  h.setUint16(12,0x21,true);h.setUint32(14,crc,true);h.setUint32(18,bytes.length,true);
  h.setUint32(22,bytes.length,true);h.setUint16(26,filename.length,true);head.set(filename,30);
  const entry=new Uint8Array(46+filename.length),e=new DataView(entry.buffer);
  e.setUint32(0,0x02014b50,true);e.setUint16(4,20,true);e.setUint16(6,20,true);e.setUint16(8,0x800,true);
  e.setUint16(14,0x21,true);e.setUint32(16,crc,true);e.setUint32(20,bytes.length,true);
  e.setUint32(24,bytes.length,true);e.setUint16(28,filename.length,true);e.setUint32(42,offset,true);
  entry.set(filename,46);local.push(head,bytes);central.push(entry);
  offset+=head.length+bytes.length;centralSize+=entry.length;
 }
 const end=new Uint8Array(22),v=new DataView(end.buffer);
 v.setUint32(0,0x06054b50,true);v.setUint16(8,files.length,true);v.setUint16(10,files.length,true);
 v.setUint32(12,centralSize,true);v.setUint32(16,offset,true);
 return new Blob([...local,...central,end],{type:"application/zip"});
}
export default function PressKit(){
 const [busy,setBusy]=useState(false),[status,setStatus]=useState("");
 useEffect(()=>{
  const previous=document.title;
  document.title="Press Kit | Puppy Clicker — Harley's Studios";
  return()=>{document.title=previous;};
 },[]);
 async function copy(value,label){
  try{await navigator.clipboard.writeText(value);setStatus(label+" copied.");}
  catch{setStatus("Copy unavailable. Select the text or download the fact sheet instead.");}
 }
 async function downloadAll(){
  setBusy(true);setStatus("Preparing the press kit…");
  try{
   const assets=await Promise.all(MEDIA.map(async asset=>{
    const response=await fetch(asset.url,{signal:AbortSignal.timeout(20000)});
    if(!response.ok||!response.headers.get("content-type")?.startsWith("image/png"))throw new Error("Media unavailable");
    return {name:asset.file,bytes:new Uint8Array(await response.arrayBuffer())};
   }));
   saveBlob(zipFiles([{name:"puppy-clicker-fact-sheet.txt",bytes:new TextEncoder().encode(factSheet())},...assets]),"puppy-clicker-press-kit.zip");
   setStatus("Press kit download started.");
  }catch{setStatus("Full download unavailable. Please retry or use the individual asset downloads.");}
  finally{setBusy(false);}
 }
 return <article className="press-kit" aria-label="Puppy Clicker press kit">
  <section className="press-hero">
   <div><p className="press-kicker">HARLEY'S STUDIOS / MEDIA RESOURCES</p><h1>Puppy Clicker<br/><span>Press Kit</span></h1>
    <p className="press-lead">Official game information, studio details, logos and original character artwork for journalists, creators and community coverage.</p>
    <div className="press-actions"><button type="button" className="pup-link-button is-primary" disabled={busy} onClick={downloadAll}>{busy?"Preparing download…":"↓ Download press kit (.zip)"}</button><a className="pup-link-button" href="/play">Play Puppy Clicker</a></div>
    <p className="press-status" role="status" aria-live="polite">{status}</p>
   </div>
   <div className="press-hero-art"><img src={MEDIA[0].url} alt="Puppy Clicker official logo"/><img className="press-mascot" src={MEDIA[3].url} alt="Buddy, the Classic puppy"/></div>
  </section>
  <nav className="press-actions press-nav" aria-label="Press kit sections">{[["facts","Fact sheet"],["about","About the game"],["features","Features"],["media","Media assets"],["contact","Contact"]].map(([id,name])=><a className="pup-link-button" key={id} href={"#"+id}>{name}</a>)}</nav>
  <section className="press-panel" id="facts"><div className="press-heading"><div><p className="press-kicker">01 / GAME INFORMATION</p><h2>Fact sheet</h2></div><button type="button" className="pup-link-button" onClick={()=>saveBlob(new Blob([factSheet()],{type:"text/plain;charset=utf-8"}),"puppy-clicker-fact-sheet.txt")}>↓ Download fact sheet (.txt)</button></div>
   <dl className="press-facts">{FACTS.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
  </section>
  <section className="press-panel" id="about"><p className="press-kicker">02 / EDITORIAL COPY</p><h2>About Puppy Clicker</h2><div className="press-copy-grid">{[["Short description",SHORT],["Full description",LONG]].map(([label,description])=><div className="press-subcard" key={label}><h3>{label}</h3><p>{description}</p><button type="button" className="pup-link-button" onClick={()=>copy(description,label)}>Copy {label.toLowerCase()}</button></div>)}</div><p className="press-note">Full gameplay may require a verified account and linked save. Minigames use virtual currencies only; no real-world cash prizes.</p></section>
  <section className="press-panel" id="features"><p className="press-kicker">03 / GAMEPLAY</p><h2>Key features</h2><div className="press-feature-grid">{FEATURES.map(([icon,title,description])=><div className="press-subcard" key={title}><span className="press-feature-icon" aria-hidden="true">{icon}</span><h3>{title}</h3><p>{description}</p></div>)}</div></section>
  <section className="press-panel" id="media"><p className="press-kicker">04 / DOWNLOADABLE MEDIA</p><h2>Logos &amp; character artwork</h2><p>Original PNG assets from the game. Download individual images at their supplied resolution.</p><div className="press-media-grid">{MEDIA.map(asset=><div className="press-subcard press-media-card" key={asset.file}><div className="press-image"><img src={asset.url} alt={asset.name+" — "+asset.kind} loading="lazy" decoding="async"/></div><h3>{asset.name}</h3><p>{asset.kind} · PNG</p><a className="pup-link-button" href={asset.url} download={asset.file}>↓ Download PNG</a></div>)}</div><p className="press-note">{GUIDELINES}</p></section>
  <section className="press-panel" id="contact"><p className="press-kicker">05 / STUDIO CONTACT</p><h2>Harley's Studios</h2><p>Independent developer and publisher of Puppy Clicker. For press, creator inquiries, interviews or media permissions, contact the studio.</p><div className="press-actions"><a className="pup-link-button is-primary" href={"mailto:"+CONTACT+"?subject=Puppy%20Clicker%20Press%20Inquiry"}>Email the studio</a><button className="pup-link-button" type="button" onClick={()=>copy(CONTACT,"Email address")}>Copy email address</button><a className="pup-link-button" href="/pupdex">Explore PupDex</a><a className="pup-link-button" href="/">Official website</a></div><p className="press-note">{CONTACT} · © {new Date().getFullYear()} Harley's Studios</p><p role="status" aria-live="polite" className="press-status">{status}</p></section>
 </article>;
}
