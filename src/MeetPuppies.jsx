import React,{useMemo,useState} from "react";
import roster from "./data/roster.js";
import {LEGACY_V6_PUPPIES} from "./native/src/engine/rosterV6.js";
import PuppyArtwork from "./native/web/PuppyArtwork.jsx";
import {PUPPY_IMAGES} from "./native/src/assets/puppies.js";

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

function PuppyCard({p}){
 // Even if the generated WebP manifest is unavailable, never use the
 // original opaque V1/V2 image on a public roster card.
 const transparentFallback=p.image.replace(/^\/assets\/(v1|v2)\//,"/assets/transparent/$1/");
 return <article className="meet-puppy-card">
  <div className="meet-puppy-art">
   <PuppyArtwork id={p.id} name={p.name+" from the Puppy Clicker roster"}
    uri={transparentFallback} size={215} lazy/>
   <span className="meet-puppy-group">{p.group==="discord"?"Community":p.group==="test"?"Test":p.group.toUpperCase()}</span>
  </div>
  <div className="meet-puppy-body">
   <h3>{p.emoji} {p.name}</h3>
   <p>{p.description}</p>
   <span>{p.group==="test"?"Development test only":p.id.includes("dev_pup")?"Developer puppy":p.group==="discord"?"Community reward":p.redeemOnly?"Special unlock":"Starter puppy"}</span>
  </div>
 </article>;
}

export default function MeetPuppies({preview=false}){
 const [query,setQuery]=useState("");
 const [category,setCategory]=useState("all");
 const puppies=useMemo(()=>preview?
  featuredIds.map(id=>publicPuppies.find(p=>p.id===id)).filter(Boolean):
  publicPuppies.filter(p=>(category==="all"||p.group===category||(category==="special"&&specialPuppy(p)))&&
   (p.name+" "+p.description).toLowerCase().includes(query.trim().toLowerCase())),
 [preview,category,query]);
 return <section className={"meet-puppies "+(preview?"meet-puppies-preview":"meet-puppies-full")}>
  <div className="section-intro">
   <p className="eyebrow">🐶 OFFICIAL PUPPY ROSTER</p>
   <h2>{preview?"Meet the puppies":"Meet the Puppy Clicker roster"}</h2>
   <p>Meet the original companions, developer pups, community rewards and test puppies. Special and testing puppies are not automatically unlocked.</p>
  </div>
  {!preview?<div className="meet-puppy-controls">
   <label className="meet-search">Search puppies
    <input type="search" aria-label="Search puppies" placeholder="Search by name or description…" value={query}
     onChange={e=>setQuery(e.target.value)}/>
   </label>
   <div className="meet-puppy-filters" role="group" aria-label="Puppy collection">
    {categories.map(([id,label])=><button key={id} type="button" className={category===id?"active":""}
     aria-pressed={category===id} onClick={()=>setCategory(id)}>{label}</button>)}
   </div>
   <p className="meet-count">{puppies.length} of {publicPuppies.length} puppies</p>
  </div>:null}
  <div className="meet-puppy-grid">
   {puppies.map(p=><PuppyCard key={p.id} p={p}/>)}
  </div>
  {!puppies.length?<p role="status" className="meet-empty">No puppies match your search. Try another name or collection.</p>:null}
  {preview?<div className="meet-more"><a href="/puppies" className="cta cta-secondary">See the full puppy roster →</a></div>:
   <div className="meet-more"><p>Want to collect these puppies? Your unlocks are managed securely in the game.</p><a href="/play" className="cta cta-primary">🐾 Play Puppy Clicker</a></div>}
 </section>;
}
