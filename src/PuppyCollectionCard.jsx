import React from 'react';
import PuppyArtwork from './native/web/PuppyArtwork.jsx';
import {rarityLabels} from './puppyRarity.js';
import {collectionCapabilities} from './puppyCollectionModes.js';
import './styles/collection-card.css';

// One web collection card for the game roster, inventory and public PupDex.
// Selection only opens details; all mutations remain in the verified game modal.
export default function PuppyCollectionCard({area='pupdex',puppy,name,image,group,rarity,unlock,statuses=[],favorite=false,
 href,onSelect,label,cardClass='',contentClass='',buttonClass='',data={},artVersion=0}){
 const tier=rarity||'common';
 const caps=collectionCapabilities(area);
 const rarityName=rarityLabels[rarity]?.replace(/^\S+\s+/u,'')||'Legacy owned';
 const content=<>
  <div className="meet-puppy-art">
   <PuppyArtwork key={puppy.id+':'+artVersion} id={puppy.id} name={name+' puppy artwork'} uri={image} size={215} lazy/>
   <span className="meet-puppy-group">{group}</span>
   {caps.showFavorites&&favorite&&<span className="collection-card-favorite" aria-label="Favorite">♥</span>}
  </div>
  <div className="meet-puppy-body">
   <h3>{name}</h3>
   <div className="meet-puppy-badges" aria-label="Rarity and availability">
    <span className="meet-puppy-badge meet-puppy-badge-rarity"><i className="pup-rarity-dot" aria-hidden="true"/>{rarityName}</span>
    {unlock&&<span className="meet-puppy-badge collection-card-unlock">{unlock}</span>}
    {statuses.map(({text,className=''})=><span key={text} className={'meet-puppy-badge '+className}>{text}</span>)}
   </div>
  </div>
 </>;
 const cls='meet-puppy-link collection-card-content '+contentClass;
 return <article className={'meet-puppy-card collection-card '+cardClass} data-rarity={tier} data-collection-mode={area} {...data}>
  {href?<a className={cls} href={href} onClick={onSelect} aria-label={label} aria-haspopup="dialog">{content}</a>:
   <div className={cls}>{content}<button type="button" className={'collection-card-select '+buttonClass}
    aria-label={label} aria-haspopup="dialog" onClick={onSelect}/></div>}
 </article>;
}
