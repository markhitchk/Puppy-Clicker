import React,{useEffect,useId,useRef,useState} from 'react';
import PuppyArtwork from './native/web/PuppyArtwork.jsx';
import PuppyAssetViewer from './native/web/PuppyAssetViewer.jsx';
import {rarityLabels,unlockText,transferText} from './puppyRarity.js';
import {creatorTemplateHref} from './creatorTemplates.js';
import {puppyDetailsHref} from './puppyLinks.js';
import {collectionCapabilities} from './puppyCollectionModes.js';
import {suggestPuppyName} from './nameSuggestions.js';
import './styles/puppy-details.css';

export default function PuppyCollectionDetails({area='pupdex',puppy,name,originalName=name,assetId,image,group,
 onClose,owned=false,current=false,favorite=false,onUse,onRename,onFavorite,onClaim,collectionStatus}){
 const ref=useRef(null),titleId=useId(),aboutId=useId();
 const [assetOpen,setAssetOpen]=useState(false),[artVersion,setArtVersion]=useState(0),[artFailed,setArtFailed]=useState(false);
 const [copyStatus,setCopyStatus]=useState(''),[stage,setStage]=useState('preview'),[draft,setDraft]=useState(name||'');
 const freeTest=['test_v1_crash_dummy','test_v2_crash_dummy'].includes(puppy.id)&&puppy.rarity==='common'&&puppy.acquisition==='standard';
 const caps=collectionCapabilities(area,{owned,current,freeTest});
 const href=puppyDetailsHref(puppy),renameValue=draft.trim().replace(/\n/g,' ').slice(0,18);
 const inventory=area==='inventory',roster=area==='roster';
 const rarity=rarityLabels[puppy.rarity]||(inventory?'Rarity unavailable':'Legacy owned');
 const unlock=puppy.unlockSource||unlockText(puppy.rarity?puppy:null);
 const transfer=puppy.transfer||transferText(puppy.rarity?puppy:null);
 const title=stage==='use'?'Use Puppy':stage==='rename'?'Rename Puppy':inventory?'Owned Puppy Details':roster&&!owned&&!freeTest?'How to Unlock':'Puppy Details';
 useEffect(()=>{
  const node=ref.current,opener=document.activeElement;
  if(node&&!node.open)node.showModal();
  return()=>{if(node?.open)node.close();if(opener instanceof HTMLElement&&opener.isConnected)opener.focus({preventScroll:true});};
 },[]);
 const dismiss=()=>{if(assetOpen)setAssetOpen(false);else if(stage!=='preview')setStage('preview');else onClose();};
 const copyLink=async()=>{
  try{await navigator.clipboard.writeText(new URL(href,window.location.origin).href);setCopyStatus('Puppy link copied!');}
  catch{setCopyStatus('Clipboard unavailable. You can copy the link from the PupDex.');}
 };
 const status=inventory?'Owned':roster?current?'Current':owned?'Unlocked':'🔒 Locked':collectionStatus;
 return <dialog ref={ref} className={'meet-puppy-dialog collection-details '+(inventory?'pup-inventory-detail-dialog':roster?'play-collection-detail-dialog':'')}
  data-collection-mode={area} aria-labelledby={titleId} aria-describedby={stage==='preview'?aboutId:undefined}
  onCancel={event=>{event.preventDefault();dismiss();}}
  onClick={event=>{if(event.target===ref.current)dismiss();}}>
  <div className="meet-puppy-dialog-inner">
   <header className="meet-detail-heading"><h2 id={titleId}>{title}</h2>
    <button type="button" className="meet-detail-close" onClick={dismiss} aria-label="Close puppy details">×</button></header>
   <div className="meet-detail-main">
    <div className="meet-detail-identity" data-rarity={puppy.rarity||'common'}>
     <div className="meet-detail-artwork"><PuppyArtwork key={puppy.id+':'+artVersion} id={puppy.id} name={name+' puppy artwork'} uri={image}
      size={164} fullResolution onUnavailable={()=>setArtFailed(true)}/></div>
     <div className="meet-detail-name"><h3>{name}</h3><p className="meet-detail-asset-id">{assetId}</p>
      <div className="meet-detail-pills"><span>{group}</span><span className="meet-detail-rarity">{rarity}</span>
       <span>{unlock}</span>{transfer&&<span>{transfer}</span>}{status&&<span className={inventory?'pup-inventory-owned-pill':''}>{status}</span>}
       {current&&inventory&&<span>Current puppy</span>}{caps.showFavorites&&favorite&&<span>♥ Favorite</span>}
      </div></div>
    </div>
    <div className="meet-detail-aside">
     {stage==='preview'?<>
      <section className="meet-detail-about"><h3>About</h3><p id={aboutId}>{puppy.description||'No additional puppy details are available yet.'}</p>
       {roster&&!owned&&<><h3>Unlock requirement</h3><p>{unlock}</p></>}
       {puppy.creatorCredit&&<p>Created by @{puppy.creatorCredit}</p>}
       {roster&&name!==originalName&&<p>Original roster name: {originalName}</p>}
      </section>
      <div className="meet-detail-actions" aria-label="Puppy tools">
       {caps.copyLink&&<button type="button" className="meet-detail-secondary" onClick={()=>void copyLink()}>Copy Link</button>}
       {(area==='pupdex'||area==='roster')&&creatorTemplateHref(puppy.id)&&<a className="meet-detail-secondary" href={creatorTemplateHref(puppy.id)}>Create from this puppy</a>}
       {caps.viewAsset&&<button type="button" className="meet-detail-secondary" onClick={()=>setAssetOpen(true)}>View Asset</button>}
      </div>
      {artFailed&&<button type="button" className="meet-detail-retry" onClick={()=>{setArtVersion(v=>v+1);setArtFailed(false);}}>↻ Retry Art</button>}
      {copyStatus&&<p className="meet-detail-copy-status" role="status">{copyStatus}</p>}
      {!caps.gameActions&&<p className="meet-detail-disclaimer">{inventory?'Inventory is read-only. Use the game Roster to switch puppies or update favorites.':'Public roster preview. Ownership and unlock status are checked in your Pup Account when playing.'}</p>}
      <div className="meet-detail-main-actions">
       {caps.canFavorite&&typeof onFavorite==='function'&&<button type="button" className="meet-detail-secondary" aria-pressed={favorite} aria-label={favorite?'Remove puppy from favorites':'Add puppy to favorites'} onClick={onFavorite}>{favorite?'♥ Favorite':'♡ Favorite'}</button>}
       {caps.canUse&&typeof onUse==='function'&&<button type="button" className="meet-detail-primary" onClick={()=>setStage('use')}>Use Puppy</button>}
       {caps.canRename&&typeof onRename==='function'&&<button type="button" className="meet-detail-secondary" onClick={()=>{setDraft(name);setStage('rename');}}>Rename Puppy</button>}
       {caps.canClaim&&typeof onClaim==='function'&&<button type="button" className="meet-detail-primary" aria-label={'Claim '+originalName+' for free'} onClick={onClaim}>Claim Free</button>}
       {inventory&&<a href={href} className="meet-detail-primary">Open in PupDex</a>}
       {area==='pupdex'&&<a href="/play" className="meet-detail-primary">Use Puppy in Game</a>}
       <button type="button" className="meet-detail-done" onClick={onClose}>Done</button>
      </div>
     </>:stage==='use'?<>
      <section className="meet-detail-about"><h3>Make active puppy</h3><p>Use {originalName} as your active puppy?</p></section>
      <div className="meet-detail-main-actions">
       <button type="button" className="meet-detail-primary" aria-label="Confirm use puppy" disabled={!caps.canUse||typeof onUse!=='function'} onClick={()=>{if(caps.canUse&&onUse){onUse(puppy.id);onClose();}}}>Use Puppy</button>
       <button type="button" className="meet-detail-done" onClick={()=>setStage('preview')}>Cancel</button>
      </div>
     </>:<>
      <section className="meet-detail-about"><h3>Rename Puppy</h3>
       <label>New puppy name<input className="collection-rename-input" value={draft} maxLength={18} onChange={event=>setDraft(event.target.value)}/></label>
       <p>{draft.length}/18</p>
       <button type="button" className="meet-detail-secondary" onClick={()=>setDraft(suggestPuppyName(draft))}>Generate random puppy name</button>
       <button type="button" className="meet-detail-secondary" onClick={()=>setDraft(originalName.slice(0,18))}>Use original name</button>
      </section>
      <div className="meet-detail-main-actions"><button type="button" className="meet-detail-primary" aria-label="Save puppy name" disabled={!caps.canRename||!renameValue||typeof onRename!=='function'} onClick={()=>{if(caps.canRename&&renameValue&&onRename){onRename(renameValue);onClose();}}}>Save</button>
       <button type="button" className="meet-detail-done" onClick={()=>setStage('preview')}>Cancel</button></div>
     </>}
    </div>
   </div>
  </div>
  {assetOpen&&<PuppyAssetViewer puppy={puppy} assetId={assetId} name={name} uri={image} collection={group}
   className={area==='pupdex'?'':'play-pupdex-asset-dialog'} onClose={()=>setAssetOpen(false)}/>}
 </dialog>;
}
