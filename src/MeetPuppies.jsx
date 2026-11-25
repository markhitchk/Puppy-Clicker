import PuppyCollectionCard from './PuppyCollectionCard.jsx';
import PuppyCollectionDetails from './PuppyCollectionDetails.jsx';
import "./styles/puppy-details.css";
import React,{useEffect,useMemo,useState} from "react";
// Import alongside the dialog so styling cannot be omitted by a partial stylesheet deploy.
import {usePuppyRarity} from './usePuppyRarity.js';
import {client} from './supabase.js';
import {pupWebApi} from './pupWebApi.js';
import {useRoster} from './native/src/state/useRoster.js';
import {collectionStats,rarityLabels,rarityOrder,unlockText,transferText} from './puppyRarity.js';
import roster from "./data/roster.js";
import {LEGACY_V6_PUPPIES} from "./native/src/engine/rosterV6.js";
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
 ["discord","Discord"],["creator","Community Creations"],["special","Special"],["test","Test puppies"]
];
const specialPuppy=p=>p.redeemOnly||p.id.includes("dev_pup")||p.group==="discord";
const groupLabel=p=>p.group==="v1"?"V1 Puppies":p.group==="v2"?"V2 Puppies":p.group==="creator"?"Community Creations":p.group==="discord"?"Community":p.group==="test"?"Test Puppies":"Special Puppies";
const transparentImage=p=>(p.image||'').replace(/^\/assets\/(v1|v2)\//,"/assets/transparent/$1/");

function PuppyCard({p,onSelect}){
 return <PuppyCollectionCard puppy={p} name={p.name} image={transparentImage(p)} group={groupLabel(p)}
  rarity={p.rarity} unlock={unlockText(p)}
  statuses={p.collectionStatus?[{text:p.collectionStatus,className:'meet-puppy-badge-status'}]:[]}
  href={puppyDetailsHref(p)} label={'View '+p.name+' puppy details'} onSelect={event=>onSelect?.(event,p)}/>;
}

function PublicPuppyDetails({puppy,onDismiss}){
 return <PuppyCollectionDetails area="pupdex" puppy={puppy} name={puppy.name}
  assetId={puppyAssetId(puppy)} image={transparentImage(puppy)} group={groupLabel(puppy)}
  collectionStatus={puppy.collectionStatus} onClose={onDismiss}/>;
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
  {preview?<div className="meet-more"><a href="/pupdex" className="cta cta-secondary">See the full puppy roster →</a></div>:
   <div className="meet-more"><p>Want to collect these puppies? Your unlocks are managed securely in the game.</p><a href="/play" className="cta cta-primary">🐾 Play Puppy Clicker</a></div>}
  {selectedPuppy?<PublicPuppyDetails key={selectedPuppy.id} puppy={selectedPuppy} onDismiss={dismissPuppy}/>:null}
 </section>;
}
