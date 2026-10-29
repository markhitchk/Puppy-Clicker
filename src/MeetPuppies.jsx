import React,{useEffect,useMemo,useRef,useState} from "react";
// Import alongside the dialog so styling cannot be omitted by a partial stylesheet deploy.
import "./puppy-details.css";
import roster from "./data/roster.js";
import {LEGACY_V6_PUPPIES} from "./native/src/engine/rosterV6.js";
import PuppyArtwork from "./native/web/PuppyArtwork.jsx";
import {PUPPY_IMAGES} from "./native/src/assets/puppies.js";
import {matchPuppy,puppyAssetId,puppyDetailsHref,readPuppyQuery,withoutPuppyQuery} from "./puppyLinks.js";

const info=new Map(LEGACY_V6_PUPPIES.map(p=>[p.id,p]));
const catalog=new Map(roster.map(p=>[p.id,p]));
// Merge the published roster and bundled image IDs. Test and developer puppies
// are first-class roster entries, not hidden simply because they are restricted.
export const publicPuppies=[...new Set([...roster.map(p=>p.id),...Object.keys(PUPPY_IMAGES)])]
 .map(id=>{
  const p=catalog.get(id)||{id};
  const details=info.get(id);
  return {
   ...p,
   id,
   image:p.image||PUPPY_IMAGES[id]?.uri,
   name:details?.name||p.name||id,
   description:details?.description||(
    p.group==="test"?"Development-only puppy used to verify game stability.":"A special Puppy Clicker companion."
   ),
   emoji:details?.emoji||"🐾",
   redeemOnly:details?.redeemOnly??p.redeemOnly??false,
   group:p.group==="discord_rewards"?"discord":p.group||details?.group||"special"
  };
 }).filter(p=>Boolean(p.image));
const featuredIds=["classic","golden","poodle","spotty","v2_frost","v2_honey","v2_dev_pup","test_v1_crash_dummy","test_v2_crash_dummy"];
const categories=[
 ["all","All puppies"],["v1","V1 classics"],["v2","V2 puppies"],
 ["discord","Community"],["special","Special"],["test","Test puppies"]
];
const specialPuppy=p=>p.redeemOnly||p.id.includes("dev_pup")||p.group==="discord";
const groupLabel=p=>p.group==="v1"?"V1 Puppies":p.group==="v2"?"V2 Puppies":p.group==="discord"?"Community":p.group==="test"?"Test Puppies":"Special Puppies";
const transparentImage=p=>p.image.replace(/^\/assets\/(v1|v2)\//,"/assets/transparent/$1/");

function PuppyCard({p,onSelect}){
 // The original opaque V1/V2 image is not used on public roster cards.
 return <article className="meet-puppy-card">
  <a className="meet-puppy-link" href={puppyDetailsHref(p)} onClick={event=>onSelect?.(event,p)}
   aria-label={"View "+p.name+" puppy details"}>
   <div className="meet-puppy-art">
    <PuppyArtwork id={p.id} name={p.name+" from the Puppy Clicker roster"}
     uri={transparentImage(p)} size={215} lazy/>
    <span className="meet-puppy-group">{groupLabel(p)}</span>
   </div>
   <div className="meet-puppy-body">
    <h3>{p.emoji} {p.name}</h3>
    <p>{p.description}</p>
    <span>{p.group==="test"?"Development test only":p.id.includes("dev_pup")?"Developer puppy":p.group==="discord"?"Community reward":p.redeemOnly?"Special unlock":"Starter puppy"}</span>
    <span className="meet-puppy-view">View puppy details →</span>
   </div>
  </a>
 </article>;
}

function PublicPuppyDetails({puppy,onDismiss}){
 const dialogRef=useRef(null);
 const [artVersion,setArtVersion]=useState(0);
 const [copyStatus,setCopyStatus]=useState("");
 const assetId=puppyAssetId(puppy);
 const href=puppyDetailsHref(puppy);
 useEffect(()=>{
  const dialog=dialogRef.current;
  if(dialog&&!dialog.open)dialog.showModal();
  return ()=>{if(dialog?.open)dialog.close();};
 },[]);
 const copyLink=async()=>{
  const url=new URL(href,window.location.origin).href;
  try{
   if(!navigator.clipboard?.writeText)throw Error("Clipboard unavailable");
   await navigator.clipboard.writeText(url);
   setCopyStatus("Puppy link copied!");
  }catch{
   setCopyStatus("Copy is unavailable. You can share the URL from your browser address bar.");
  }
 };
 return <dialog ref={dialogRef} className="meet-puppy-dialog"
  aria-labelledby="meet-puppy-dialog-title" aria-describedby="meet-puppy-dialog-info"
  onCancel={event=>{event.preventDefault();onDismiss();}}
  onClick={event=>{if(event.target===dialogRef.current)onDismiss();}}>
  <div className="meet-puppy-dialog-inner">
   <header className="meet-detail-heading">
    <h2 id="meet-puppy-dialog-title">Puppy Details</h2>
    <button type="button" className="meet-detail-close" onClick={onDismiss} aria-label="Close puppy details">×</button>
   </header>
   <div className="meet-detail-identity">
    <div className="meet-detail-artwork">
     <PuppyArtwork key={assetId+"-"+artVersion} id={puppy.id}
      name={puppy.name+" puppy"} uri={transparentImage(puppy)} size={164}/>
    </div>
    <div className="meet-detail-name">
     <h3>{puppy.name}</h3>
     <p className="meet-detail-asset-id">{assetId}</p>
     <div className="meet-detail-pills">
      <span>{groupLabel(puppy)}</span>
      <span>{puppy.group==="test"?"Testing only":puppy.redeemOnly?"Special unlock":"Starter puppy"}</span>
     </div>
    </div>
   </div>
   <section className="meet-detail-about" aria-labelledby="meet-detail-about-heading">
    <h3 id="meet-detail-about-heading">About</h3>
    <p id="meet-puppy-dialog-info">{puppy.description||"No additional puppy details are available yet."}</p>
   </section>
   <div className="meet-detail-actions">
    <button type="button" className="meet-detail-secondary" onClick={()=>void copyLink()}>↗ Copy link</button>
    <button type="button" className="meet-detail-secondary"
     onClick={()=>{setArtVersion(v=>v+1);setCopyStatus("Artwork reloaded.");}}>↻ Retry Art</button>
   </div>
   {copyStatus?<p className="meet-detail-copy-status" role="status">{copyStatus}</p>:null}
   <p className="meet-detail-disclaimer">Public roster preview. Ownership and unlock status are checked in your Pup Account when playing.</p>
   <a className="meet-detail-primary" href="/play">Use Puppy in Game</a>
   <button type="button" className="meet-detail-primary" onClick={onDismiss}>Done</button>
  </div>
 </dialog>;
}

export default function MeetPuppies({preview=false}){
 const [query,setQuery]=useState("");
 const [category,setCategory]=useState("all");
 const [selectedId,setSelectedId]=useState(()=>!preview&&typeof window!=="undefined"
  ?readPuppyQuery(window.location.search):null);
 const puppies=useMemo(()=>preview?
  featuredIds.map(id=>publicPuppies.find(p=>p.id===id)).filter(Boolean):
  publicPuppies.filter(p=>(category==="all"||p.group===category||(category==="special"&&specialPuppy(p)))&&
   (p.name+" "+p.description+" "+puppyAssetId(p)).toLowerCase().includes(query.trim().toLowerCase())),
 [preview,category,query]);
 const selectedPuppy=!preview?matchPuppy(publicPuppies,selectedId):null;

 useEffect(()=>{
  if(preview)return;
  const syncFromUrl=()=>setSelectedId(readPuppyQuery(window.location.search));
  window.addEventListener("popstate",syncFromUrl);
  return ()=>window.removeEventListener("popstate",syncFromUrl);
 },[preview]);

 const selectPuppy=(event,puppy)=>{
  // Home preview cards use their real href so navigation also works without JS.
  if(preview||event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  event.preventDefault();
  const url=new URL(window.location.href);
  url.searchParams.set("pup",puppyAssetId(puppy));
  for(const key of ["puppy","id","asset",""])url.searchParams.delete(key);
  window.history.pushState(window.history.state,"",url.pathname+url.search+url.hash);
  setSelectedId(puppyAssetId(puppy));
 };

 const dismissPuppy=()=>{
  const url=new URL(window.location.href);
  const search=withoutPuppyQuery(url.search);
  window.history.replaceState(window.history.state,"",url.pathname+search+url.hash);
  setSelectedId(null);
 };

 return <section className={"meet-puppies "+(preview?"meet-puppies-preview":"meet-puppies-full")}>
  <div className="section-intro">
   <p className="eyebrow">🐶 OFFICIAL PUPPY ROSTER</p>
   <h2>{preview?"Meet the puppies":"Meet the Puppy Clicker roster"}</h2>
   <p>Meet the original companions, developer pups, community rewards and test puppies. Special and testing puppies are not automatically unlocked.</p>
  </div>
  {!preview?<div className="meet-puppy-controls">
   <label className="meet-search">Search puppies
    <input type="search" aria-label="Search puppies" placeholder="Search by name, description or asset ID…" value={query}
     onChange={e=>setQuery(e.target.value)}/>
   </label>
   <div className="meet-puppy-filters" role="group" aria-label="Puppy collection">
    {categories.map(([id,label])=><button key={id} type="button" className={category===id?"active":""}
     aria-pressed={category===id} onClick={()=>setCategory(id)}>{label}</button>)}
   </div>
   <p className="meet-count">{puppies.length} of {publicPuppies.length} puppies</p>
  </div>:null}
  <div className="meet-puppy-grid">
   {puppies.map(p=><PuppyCard key={p.id} p={p} onSelect={selectPuppy}/>)}
  </div>
  {!puppies.length?<p role="status" className="meet-empty">No puppies match your search. Try another name or collection.</p>:null}
  {preview?<div className="meet-more"><a href="/puppies" className="cta cta-secondary">See the full puppy roster →</a></div>:
   <div className="meet-more"><p>Want to collect these puppies? Your unlocks are managed securely in the game.</p><a href="/play" className="cta cta-primary">🐾 Play Puppy Clicker</a></div>}
  {selectedPuppy?<PublicPuppyDetails key={selectedPuppy.id} puppy={selectedPuppy} onDismiss={dismissPuppy}/>:null}
 </section>;
}
