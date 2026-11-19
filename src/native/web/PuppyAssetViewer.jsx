import React,{useLayoutEffect,useId,useRef,useState} from 'react';
import PuppyArtwork from './PuppyArtwork.jsx';
import {rarityLabels} from '../../puppyRarity.js';
import '../../styles/artwork.css';

export default function PuppyAssetViewer({puppy,assetId,name,uri,collection,onClose,className=""}){
 const titleId=useId();
 const dialogRef=useRef(null);
 const [checkerboard,setCheckerboard]=useState(true);
 const [artVersion,setArtVersion]=useState(0);
 const [failed,setFailed]=useState(false);
 const [status,setStatus]=useState('');
 useLayoutEffect(()=>{
  const dialog=dialogRef.current;
  const opener=document.activeElement;
  dialog.showModal();
  return ()=>{
   dialog.close();
   if(opener instanceof HTMLElement && opener.isConnected)opener.focus({preventScroll:true});
  };
 },[]);
 const copyId=async()=>{
  try{
   if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');
   await navigator.clipboard.writeText(assetId);
   setStatus('Asset ID copied!');
  }catch{
   setStatus('Clipboard unavailable. You can select the asset ID above.');
  }
 };
 return <dialog ref={dialogRef} className={("meet-asset-dialog "+className).trim()}
  aria-labelledby={titleId}
  onCancel={event=>{event.preventDefault();event.stopPropagation();onClose();}}
  onClick={event=>{event.stopPropagation();if(event.target===dialogRef.current)onClose();}}>
  <div className="meet-asset-inner">
   <header className="meet-asset-header">
    <div><p className="meet-asset-eyebrow">Puppy artwork</p>
     <h2 id={titleId}>{name}</h2></div>
    <button className="meet-asset-close" type="button"
     aria-label="Close asset viewer" onClick={onClose}>×</button>
   </header>
   <div className="meet-asset-layout">
   <div className={'meet-asset-stage'+(checkerboard?' meet-asset-checker':'')}
    data-rarity={(puppy.rarity||'common')}>
    <PuppyArtwork key={puppy.id+'-viewer-'+artVersion} id={puppy.id}
     name={name+' full-size transparent puppy artwork'}
     uri={uri} size={480} fullResolution
     onUnavailable={()=>setFailed(true)}/>
   </div>
   <aside className="meet-asset-panel" aria-label="Artwork information and controls">
   <div className="meet-asset-info">
    <span className="meet-puppy-badge meet-puppy-badge-rarity"
     data-rarity={(puppy.rarity||'common')}>{rarityLabels[puppy.rarity]||'Legacy owned'}</span>
    <span className="meet-asset-id">{assetId}</span>
    <span>{collection}</span>
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
