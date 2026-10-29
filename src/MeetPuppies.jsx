import React,{useMemo,useState} from "react";
import roster from "./data/roster.js";
import {LEGACY_V6_PUPPIES} from "./native/src/engine/rosterV6.js";
import PuppyArtwork from "./native/web/PuppyArtwork.jsx";

const info=new Map(LEGACY_V6_PUPPIES.map(p=>[p.id,p]));
export const publicPuppies=roster
 .filter(p=>p.group!=="test")
 .map(p=>({
  ...p,
  name:info.get(p.id)?.name||p.name,
  description:info.get(p.id)?.description||"A special Puppy Clicker companion.",
  emoji:info.get(p.id)?.emoji||"🐾",
  group:p.group==="discord_rewards"?"discord":p.group
 }));
const featuredIds=["classic","golden","poodle","spotty","v2_frost","v2_honey"];
const categories=[["all","All puppies"],["v1","V1 classics"],["v2","V2 puppies"],["discord","Community"]];

function PuppyCard({p}){
 return <article className="meet-puppy-card">
  <div className="meet-puppy-art">
   <PuppyArtwork id={p.id} name={p.name+" from the Puppy Clicker roster"}
    uri={p.image} size={215} lazy/>
   <span className="meet-puppy-group">{p.group==="discord"?"Community":p.group.toUpperCase()}</span>
  </div>
  <div className="meet-puppy-body">
   <h3>{p.emoji} {p.name}</h3>
   <p>{p.description}</p>
   <span>{p.redeemOnly?"Special unlock":"Starter puppy"}</span>
  </div>
 </article>;
}

export default function MeetPuppies({preview=false}){
 const [query,setQuery]=useState("");
 const [category,setCategory]=useState("all");
 const puppies=useMemo(()=>preview?
  featuredIds.map(id=>publicPuppies.find(p=>p.id===id)).filter(Boolean):
  publicPuppies.filter(p=>(category==="all"||p.group===category)&&
   (p.name+" "+p.description).toLowerCase().includes(query.trim().toLowerCase())),
 [preview,category,query]);
 return <section className={"meet-puppies "+(preview?"meet-puppies-preview":"meet-puppies-full")}>
  <div className="section-intro">
   <p className="eyebrow">🐶 OFFICIAL PUPPY ROSTER</p>
   <h2>{preview?"Meet the puppies":"Meet the Puppy Clicker roster"}</h2>
   <p>Say hello to the original companions and special pups you'll discover in Puppy Clicker. Some need a special unlock!</p>
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
