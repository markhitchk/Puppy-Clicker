import PuppyAssetViewer from './PuppyAssetViewer.jsx';
import React from 'react';
import PuppyCollectionCard from '../../PuppyCollectionCard.jsx';
import {unlockText} from '../../puppyRarity.js';
import {PUPPY_IMAGES} from '../src/assets/puppies.js';

// Shared artwork and rarity styles with /pupdex, while keeping all gameplay
// mutations inside the existing verified /play actions.
function transparentArt(puppy){
 const image=PUPPY_IMAGES[puppy.id]?.uri||puppy.image||'';
 return image.replace(/^\/assets\/(v1|v2)\//,'/assets/transparent/$1/');
}
const groupFor=puppy=>puppy.groupTitle||'Puppies';

export function WebPlayPupDexCard({puppy,name,owned,current,favorite,onInspect,artVersion=0}){
 return <PuppyCollectionCard puppy={puppy} name={name} image={transparentArt(puppy)}
  group={groupFor(puppy)} rarity={puppy.rarity} unlock={puppy.rarity?unlockText(puppy):'Owned from an earlier version'}
  statuses={[{text:current?'Current':owned?'Unlocked':'🔒 Locked',className:current?'meet-puppy-badge-status play-pupdex-current':owned?'meet-puppy-badge-status':'play-pupdex-locked'}]}
  favorite={favorite} artVersion={artVersion} cardClass="play-pupdex-card" contentClass="play-pupdex-card-content"
  data={{'data-pup-card':puppy.id,'data-owned':String(owned),'data-current':String(current)}}
  label={'Inspect '+(puppy.name||name)} onSelect={()=>onInspect(puppy.id)}/>;
}

// The same full-resolution lightbox interaction as the public PupDex, but
// launched from the authenticated roster's existing puppy-detail modal.
export function WebPlayPuppyAssetViewer({puppy,assetId,name,onClose}){
 if(!puppy)return null;
 return <PuppyAssetViewer puppy={puppy} name={name} assetId={assetId}
  uri={transparentArt(puppy)} collection={groupFor(puppy)} onClose={onClose}
  className="play-pupdex-asset-dialog"/>;
}
