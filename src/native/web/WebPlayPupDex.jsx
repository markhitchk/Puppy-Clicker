import PuppyAssetViewer from './PuppyAssetViewer.jsx';
import React,{useEffect,useState} from 'react';
import PuppyArtwork from './PuppyArtwork.jsx';
import {rarityLabels,unlockText} from '../../puppyRarity.js';
import {PUPPY_IMAGES} from '../src/assets/puppies.js';

// Shared artwork and rarity styles with /pupdex, while keeping all gameplay
// mutations inside the existing verified /play actions.
function transparentArt(puppy){
 const image=PUPPY_IMAGES[puppy.id]?.uri||puppy.image||'';
 return image.replace(/^\/assets\/(v1|v2)\//,'/assets/transparent/$1/');
}
const tierFor=puppy=>puppy.rarity||'common';
const groupFor=puppy=>puppy.groupTitle||'Puppies';
// Render the rarity marker with CSS instead of platform-dependent emoji discs.
const rarityName=rarity=>rarityLabels[rarity]?.replace(/^\S+\s+/u,'')||'Legacy owned';

export function WebPlayPupDexCard({puppy,assetId,name,owned,current,favorite,
 onInspect,onUse,onClaimFree,onToggleFavorite,artVersion=0,onRetry}){
 const [artFailed,setArtFailed]=useState(false);
 useEffect(()=>setArtFailed(false),[puppy.id,artVersion]);
 const rarity=tierFor(puppy);
 const freeTest=['test_v1_crash_dummy','test_v2_crash_dummy'].includes(puppy.id)&&puppy.rarity==='common';
 return <article className="meet-puppy-card play-pupdex-card" data-rarity={rarity}
  data-pup-card={puppy.id} data-owned={owned?'true':'false'} data-current={current?'true':'false'}
  aria-label={name+' roster card'}>
  <div className="meet-puppy-link play-pupdex-card-content">
   <button type="button" className="play-pupdex-art-button"
    onClick={()=>onInspect(puppy.id)}
    aria-label={'Inspect '+(puppy.name||name)}>
    <div className="meet-puppy-art">
     <PuppyArtwork key={puppy.id+':'+artVersion} id={puppy.id}
      name={name+' from your Puppy Roster'} uri={transparentArt(puppy)}
      size={215} lazy onUnavailable={()=>setArtFailed(true)}/>
     <span className="meet-puppy-group">{groupFor(puppy)}</span>
    </div>
   </button>
   <div className="meet-puppy-body">
    <h3>{name}</h3>
    <p className="play-pupdex-asset-id">{assetId}</p>
    <div className="meet-puppy-badges" aria-label="Rarity and availability">
     <span className="meet-puppy-badge meet-puppy-badge-rarity"><i className="pup-rarity-dot" aria-hidden="true"/>{rarityName(puppy.rarity)}</span>
     <span className="meet-puppy-badge">{puppy.rarity?unlockText(puppy):'Owned from an earlier version'}</span>
     <span className={'meet-puppy-badge '+(current?'meet-puppy-badge-status play-pupdex-current':owned?'meet-puppy-badge-status':'play-pupdex-locked')}>
      {current?'Current':owned?'Unlocked':'🔒 Locked'}
     </span>
    </div>
    <div className="play-pupdex-actions">
     <button type="button" className="meet-puppy-view play-pupdex-details"
      onClick={()=>onInspect(puppy.id)}>View Details <span aria-hidden="true">↗</span></button>
     {freeTest&&!owned&&<button type="button" className="play-pupdex-use"
      onClick={()=>onClaimFree(puppy.id)} aria-label={'Claim '+name+' for free'}>Claim Free</button>}
     {owned&&!current&&<button type="button" className="play-pupdex-use"
      onClick={()=>onUse(puppy.id)} aria-label={'Use '+name}>Use Puppy</button>}
     {owned&&current&&<span className="play-pupdex-current-action" aria-label={name+' is your current puppy'}>✓ Equipped</span>}
     <button type="button" className="play-pupdex-favorite" disabled={!owned}
      aria-pressed={favorite} aria-label={(favorite?'Remove ':'Add ')+name+(favorite?' from favorites':' to favorites')}
      onClick={()=>onToggleFavorite(puppy.id)}>
      {favorite?'♥ Favorite':'♡ Favorite'}</button>
     {artFailed&&<button type="button" className="play-pupdex-retry"
      onClick={()=>{setArtFailed(false);onRetry(puppy.id);}}>↻ Retry Art</button>}
    </div>
   </div>
  </div>
 </article>;
}

// The same full-resolution lightbox interaction as the public PupDex, but
// launched from the authenticated roster's existing puppy-detail modal.
export function WebPlayPuppyAssetViewer({puppy,assetId,name,onClose}){
 if(!puppy)return null;
 return <PuppyAssetViewer puppy={puppy} name={name} assetId={assetId}
  uri={transparentArt(puppy)} collection={groupFor(puppy)} onClose={onClose}
  className="play-pupdex-asset-dialog"/>;
}
