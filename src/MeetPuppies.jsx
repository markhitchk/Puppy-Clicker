import React,{useEffect,useMemo,useRef,useState} from "react";
// Import alongside the dialog so styling cannot be omitted by a partial stylesheet deploy.
import "./puppy-details.css";
import {usePuppyRarity} from './usePuppyRarity.js';
import {client} from './supabase.js';
import {pupWebApi} from './pupWebApi.js';
import {useRoster} from './native/src/state/useRoster.js';
import {collectionStats,rarityLabels,rarityOrder,unlockText,transferText} from './puppyRarity.js';
import roster from "./data/roster.js";
import {LEGACY_V6_PUPPIES} from "./native/src/engine/rosterV6.js";
import PuppyArtwork from "./native/web/PuppyArtwork.jsx";
import {PUPPY_IMAGES} from "./native/src/assets/puppies.js";
import {matchPuppy,puppyAssetId,puppyDetailsHref,readPuppyQuery,withoutPuppyQuery} from "./puppyLinks.js";

const info=new Map(LEGACY_V6_PUPPIES.map(p=>[p.id,p]));
const catalog=new Map(roster.map(p=>[p.id,p]));
// Merge the published roster and bundled image IDs. Test and developer puppies
// are first-class roster entries, not hidden simply because they are restricted.
const artworkCatalog=[...new Set([...roster.map(p=>p.id),...Object.keys(PUPPY_IMAGES)])]
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
const transparentImage=p=>(p.image||'').replace(/^\/assets\/(v1|v2)\//,"/assets/transparent/$1/");

function PuppyCard({p,onSelect}){
 // The full card is one accessible link; badge pills are non-interactive.
 return <article className="meet-puppy-card" data-rarity={p.rarity||'common'}>
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
    <div className="meet-puppy-badges" aria-label="Puppy classification">
     <span className="meet-puppy-badge meet-puppy-badge-rarity">{rarityLabels[p.rarity]}</span>
     <span className="meet-puppy-badge">{unlockText(p)}</span>
     {p.collectionStatus&&<span className="meet-puppy-badge meet-puppy-badge-status">{p.collectionStatus}</span>}
    </div>
    <span className="meet-puppy-view">View puppy details <span aria-hidden="true">↗</span></span>
   </div>
  </a>
 </article>;
}

function PublicPuppyDetails({puppy,onDismiss}){
 const dialogRef=useRef(null);
 const assetDialogRef=useRef(null);
 const [artVersion,setArtVersion]=useState(0);
 const [artFailed,setArtFailed]=useState(false);
 const [assetOpen,setAssetOpen]=useState(false);
 const [checkerboard,setCheckerboard]=useState(true);
 const [copyStatus,setCopyStatus]=useState("");
 const [assetStatus,setAssetStatus]=useState("");
 const assetId=puppyAssetId(puppy);
 const href=puppyDetailsHref(puppy);
 useEffect(()=>{
  const dialog=dialogRef.current;
  if(dialog&&!dialog.open)dialog.showModal();
  return ()=>{if(dialog?.open)dialog.close();};
 },[]);
 useEffect(()=>{
  if(!assetOpen)return;
  const dialog=assetDialogRef.current;
  if(dialog&&!dialog.open)dialog.showModal();
  return ()=>{if(dialog?.open)dialog.close();};
 },[assetOpen]);
 const retryArtwork=()=>{
  setArtFailed(false);
  setArtVersion(version=>version+1);
  setAssetStatus("Artwork reloading.");
 };
 const copyText=async(value,success,onStatus)=>{
  try{
   if(!navigator.clipboard?.writeText)throw Error("Clipboard unavailable");
   await navigator.clipboard.writeText(value);
   onStatus(success);
  }catch{
   onStatus("Clipboard unavailable. You can copy this information from the page.");
  }
 };
 const closeAssetViewer=()=>{setAssetOpen(false);setAssetStatus("");};
 const dismiss=()=>{if(assetOpen)closeAssetViewer();else onDismiss();};
 return <dialog ref={dialogRef} className="meet-puppy-dialog"
  aria-labelledby="meet-puppy-dialog-title" aria-describedby="meet-puppy-dialog-info"
  onCancel={event=>{event.preventDefault();dismiss();}}
  onClick={event=>{if(event.target===dialogRef.current)dismiss();}}>
  <div className="meet-puppy-dialog-inner">
   <header className="meet-detail-heading">
    <h2 id="meet-puppy-dialog-title">Puppy Details</h2>
    <button type="button" className="meet-detail-close" onClick={dismiss} aria-label="Close puppy details">×</button>
   </header>
   <div className="meet-detail-main">
    <div className="meet-detail-identity" data-rarity={puppy.rarity||'common'}>
     <div className="meet-detail-artwork">
      <PuppyArtwork key={assetId+"-"+artVersion} id={puppy.id}
       name={puppy.name+" puppy"} uri={transparentImage(puppy)} size={164}
       onUnavailable={()=>setArtFailed(true)}/>
     </div>
     <div className="meet-detail-name">
      <h3>{puppy.name}</h3>
      <p className="meet-detail-asset-id">{assetId}</p>
      <div className="meet-detail-pills">
       <span>{groupLabel(puppy)}</span>
       <span className="meet-detail-rarity">{rarityLabels[puppy.rarity]}</span>
       <span>{unlockText(puppy)}</span>
       <span>{transferText(puppy)}</span>
       {puppy.collectionStatus&&<span>{puppy.collectionStatus}</span>}
      </div>
     </div>
    </div>
    <div className="meet-detail-aside">
     <section className="meet-detail-about" aria-labelledby="meet-detail-about-heading">
      <h3 id="meet-detail-about-heading">About</h3>
      <p id="meet-puppy-dialog-info">{puppy.description||"No additional puppy details are available yet."}</p>
     </section>
     <div className="meet-detail-actions" aria-label="Puppy tools">
      <button type="button" className="meet-detail-secondary"
       onClick={()=>void copyText(new URL(href,window.location.origin).href,"Puppy link copied!",setCopyStatus)}>Copy Link</button>
      <button type="button" className="meet-detail-secondary" onClick={()=>{setCopyStatus("");setAssetOpen(true);}}>View Asset</button>
     </div>
     {artFailed&&<button type="button" className="meet-detail-retry" onClick={retryArtwork}>↻ Retry Art</button>}
     {copyStatus?<p className="meet-detail-copy-status" role="status">{copyStatus}</p>:null}
     <p className="meet-detail-disclaimer">Public roster preview. Ownership and unlock status are checked in your Pup Account when playing.</p>
     <div className="meet-detail-main-actions">
      <a className="meet-detail-primary" href="/play">Use Puppy in Game</a>
      <button type="button" className="meet-detail-done" onClick={onDismiss}>Done</button>
     </div>
    </div>
   </div>
  </div>
  {assetOpen&&<dialog ref={assetDialogRef} className="meet-asset-dialog"
   aria-labelledby="meet-asset-title"
   onCancel={event=>{event.preventDefault();event.stopPropagation();closeAssetViewer();}}
   onClick={event=>{event.stopPropagation();if(event.target===assetDialogRef.current)closeAssetViewer();}}>
   <div className="meet-asset-inner">
    <header className="meet-asset-header">
     <div><p className="meet-asset-eyebrow">Puppy artwork</p><h2 id="meet-asset-title">{puppy.name}</h2></div>
     <button type="button" className="meet-asset-close" aria-label="Close asset viewer" onClick={closeAssetViewer}>×</button>
    </header>
    <div className={"meet-asset-stage"+(checkerboard?" meet-asset-checker":"")} data-rarity={puppy.rarity||'common'}>
     <PuppyArtwork key={assetId+"-full-"+artVersion} id={puppy.id}
      name={puppy.name+" full-size transparent puppy artwork"}
      uri={transparentImage(puppy)} size={480}
      onUnavailable={()=>setArtFailed(true)}/>
    </div>
    <div className="meet-asset-info">
     <span className="meet-puppy-badge meet-puppy-badge-rarity" data-rarity={puppy.rarity||'common'}>{rarityLabels[puppy.rarity]}</span>
     <span className="meet-asset-id">{assetId}</span>
     <span>{groupLabel(puppy)}</span>
    </div>
    <div className="meet-asset-actions">
     <button type="button" className="meet-detail-secondary"
      aria-pressed={checkerboard} onClick={()=>setCheckerboard(value=>!value)}>
      {checkerboard?"Hide transparency grid":"Show transparency grid"}</button>
     <button type="button" className="meet-detail-secondary"
      onClick={()=>void copyText(assetId,"Asset ID copied!",setAssetStatus)}>Copy Asset ID</button>
     {artFailed&&<button type="button" className="meet-detail-retry" onClick={retryArtwork}>↻ Retry Art</button>}
     <button type="button" className="meet-detail-done" onClick={closeAssetViewer}>Close Viewer</button>
    </div>
    {assetStatus&&<p className="meet-detail-copy-status" role="status">{assetStatus}</p>}
   </div>
  </dialog>}
 </dialog>;
}

export default function MeetPuppies({preview=false}){
 const catalogState=usePuppyRarity();
 const {items}=useRoster();
 const [owned,setOwned]=useState(null);
 useEffect(()=>{
  if(preview||!client)return;
  let active=true,version=0;
  const sessionChanged=(_event,session)=>{
   const request=++version;
   setOwned(null);
   if(session?.access_token)queueMicrotask(()=>pupWebApi({action:'pupdex-owned'}).then(data=>{
    if(active&&request===version)setOwned(data.owned);
   }).catch(()=>{}));
  };
  const {data}=client.auth.onAuthStateChange(sessionChanged);
  return ()=>{active=false;data.subscription.unsubscribe();};
 },[preview]);
 const publicPuppies=useMemo(()=>catalogState.rows.map(row=>{
  const remote=items.find(p=>p.id===row.puppy_id);
  const art=artworkCatalog.find(p=>p.id===row.puppy_id)||{
   ...remote,id:row.puppy_id,name:remote?.name||row.puppy_id,group:remote?.groupId||'special'
  };
  const collectionStatus=owned?owned.includes(row.puppy_id)?'Unlocked':'Locked':row.rarity==='unobtainable'?'Locked':null;
  return {...art,...row,collectionStatus};
 }),[catalogState.rows,items,owned]);
 const [tier,setTier]=useState('all'),[order,setOrder]=useState('roster');
 const [query,setQuery]=useState("");
 const [category,setCategory]=useState("all");
 const [selectedId,setSelectedId]=useState(()=>!preview&&typeof window!=="undefined"
  ?readPuppyQuery(window.location.search):null);
 const puppies=useMemo(()=>preview?
  featuredIds.map(id=>publicPuppies.find(p=>p.id===id)).filter(Boolean):
  publicPuppies.filter(p=>(tier==="all"||p.rarity===tier)&&(category==="all"||p.group===category||(category==="special"&&specialPuppy(p)))&&
   (p.name+" "+p.description+" "+puppyAssetId(p)).toLowerCase().includes(query.trim().toLowerCase())).sort((a,b)=>order==="rarity"?rarityOrder.indexOf(b.rarity)-rarityOrder.indexOf(a.rarity):0),
 [preview,category,query,tier,order,publicPuppies]);
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
   <h2>{preview?"Meet the puppies":"PupDex"}</h2>
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
   <div className="meet-puppy-sort-controls">
    <label>Rarity <select aria-label="Rarity" value={tier} onChange={e=>setTier(e.target.value)}><option value="all">All rarities</option>{rarityOrder.map(k=><option key={k} value={k}>{rarityLabels[k]}</option>)}</select></label>
    <label>Sort <select aria-label="Sort puppies" value={order} onChange={e=>setOrder(e.target.value)}><option value="roster">Roster order</option><option value="rarity">Rarity</option></select></label>
   </div>
   <div className="meet-puppy-counts">
    {owned&&<p className="meet-count">{collectionStats(catalogState.rows,owned)}</p>}
    <p className="meet-count">{puppies.length} of {publicPuppies.length} puppies</p>
   </div>
  </div>:null}
  <div className="meet-puppy-grid">
   {puppies.map(p=><PuppyCard key={p.id} p={p} onSelect={selectPuppy}/>)}
  </div>
  {!puppies.length?<p role="status" className="meet-empty">{catalogState.loading?"Loading PupDex…":catalogState.error?"The PupDex is currently unavailable.":"No puppies match your filters."}</p>:null}
  {preview?<div className="meet-more"><a href="/puppies" className="cta cta-secondary">See the full puppy roster →</a></div>:
   <div className="meet-more"><p>Want to collect these puppies? Your unlocks are managed securely in the game.</p><a href="/play" className="cta cta-primary">🐾 Play Puppy Clicker</a></div>}
  {selectedPuppy?<PublicPuppyDetails key={selectedPuppy.id} puppy={selectedPuppy} onDismiss={dismissPuppy}/>:null}
 </section>;
}
