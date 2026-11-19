import React,{useEffect,useRef,useState} from 'react';
import PuppyArtwork from './PuppyArtwork.jsx';
import {rarityLabels,unlockText} from '../../puppyRarity.js';
import {PUPPY_IMAGES} from '../src/assets/puppies.js';

// Shared artwork and rarity styles with /puppies, while keeping all gameplay
// mutations inside the existing verified /play actions.
function transparentArt(puppy){
 const image=PUPPY_IMAGES[puppy.id]?.uri||puppy.image||'';
 return image.replace(/^\/assets\/(v1|v2)\//,'/assets/transparent/$1/');
}
const tierFor=puppy=>puppy.rarity||'common';
const groupFor=puppy=>puppy.groupTitle||'Puppies';

export function WebPlayPupDexCard({puppy,assetId,name,owned,current,favorite,
 onInspect,onUse,onClaimFree,onToggleFavorite,artVersion=0,onRetry}){
 const [artFailed,setArtFailed]=useState(false);
 useEffect(()=>setArtFailed(false),[puppy.id,artVersion]);
 const rarity=tierFor(puppy);
 const freeTest=['test_v1_crash_dummy','test_v2_crash_dummy'].includes(puppy.id)&&puppy.rarity==='common';
 return <article className="meet-puppy-card play-pupdex-card" data-rarity={rarity}
  data-pup-card={puppy.id} aria-label={name+' roster card'}>
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
     <span className="meet-puppy-badge meet-puppy-badge-rarity">{rarityLabels[puppy.rarity]||'Legacy owned'}</span>
     <span className="meet-puppy-badge">{puppy.rarity?unlockText(puppy):'Owned from an earlier version'}</span>
     <span className={'meet-puppy-badge '+(owned?'meet-puppy-badge-status':'play-pupdex-locked')}>
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
 const dialogRef=useRef(null);
 const [checkerboard,setCheckerboard]=useState(true);
 const [artVersion,setArtVersion]=useState(0);
 const [failed,setFailed]=useState(false);
 const [status,setStatus]=useState('');
 useEffect(()=>{
  const dialog=dialogRef.current;
  if(dialog&&!dialog.open)dialog.showModal();
  return ()=>{if(dialog?.open)dialog.close();};
 },[]);
 if(!puppy)return null;
 const copyId=async()=>{
  try{
   if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');
   await navigator.clipboard.writeText(assetId);
   setStatus('Asset ID copied!');
  }catch{
   setStatus('Clipboard unavailable. You can select the asset ID above.');
  }
 };
 return <dialog ref={dialogRef} className="meet-asset-dialog play-pupdex-asset-dialog"
  aria-labelledby="play-pupdex-asset-title"
  onCancel={event=>{event.preventDefault();onClose();}}
  onClick={event=>{if(event.target===dialogRef.current)onClose();}}>
  <div className="meet-asset-inner">
   <header className="meet-asset-header">
    <div><p className="meet-asset-eyebrow">Puppy artwork</p>
     <h2 id="play-pupdex-asset-title">{name}</h2></div>
    <button className="meet-asset-close" type="button"
     aria-label="Close asset viewer" onClick={onClose}>×</button>
   </header>
   <div className="meet-asset-layout">
   <div className={'meet-asset-stage'+(checkerboard?' meet-asset-checker':'')}
    data-rarity={tierFor(puppy)}>
    <PuppyArtwork key={puppy.id+'-viewer-'+artVersion} id={puppy.id}
     name={name+' full-size transparent puppy artwork'}
     uri={transparentArt(puppy)} size={480} fullResolution
     onUnavailable={()=>setFailed(true)}/>
   </div>
   <aside className="meet-asset-panel" aria-label="Artwork information and controls">
   <div className="meet-asset-info">
    <span className="meet-puppy-badge meet-puppy-badge-rarity"
     data-rarity={tierFor(puppy)}>{rarityLabels[puppy.rarity]||'Legacy owned'}</span>
    <span className="meet-asset-id">{assetId}</span>
    <span>{groupFor(puppy)}</span>
   </div>
   <div className="meet-asset-actions">
    <button type="button" className="meet-detail-secondary" aria-pressed={checkerboard}
     onClick={()=>setCheckerboard(value=>!value)}>
     {checkerboard?'Hide transparency grid':'Show transparency grid'}</button>
    <button type="button" className="meet-detail-secondary" onClick={()=>void copyId()}>Copy Asset ID</button>
    {failed&&<button type="button" className="meet-detail-retry"
     onClick={()=>{setFailed(false);setArtVersion(v=>v+1);setStatus('Artwork reloading.');}}>
     ↻ Retry Art</button>}
    <button type="button" className="meet-detail-done" onClick={onClose}>Close Viewer</button>
   </div>
   {status&&<p className="meet-detail-copy-status" role="status">{status}</p>}
   </aside>
   </div>
  </div>
 </dialog>;
}
