import PuppyCollectionCard from './PuppyCollectionCard.jsx';
import "./styles/puppy-details.css";
import React,{useEffect,useRef,useState} from 'react';
import {ROSTER,UPGRADES,RARITIES} from './native/src/engine/game.js';
import {LEGACY_V6_PUPPIES} from './native/src/engine/rosterV6.js';
import {PUPPY_IMAGES} from './native/src/assets/puppies.js';
import PuppyArtwork from './native/web/PuppyArtwork.jsx';
import {WebPlayPuppyAssetViewer} from './native/web/WebPlayPupDex.jsx';
import {usePuppyRarity} from './usePuppyRarity.js';
import {rarityLabels,rarityOrder,unlockText,transferText} from './puppyRarity.js';
import {puppyDetailsHref,puppyAssetId} from './puppyLinks.js';
import {useWebAccount} from './native/web/AccountGate.jsx';
import {projectKotlinCloudSave} from './native/src/production/kotlinCloudPreview.js';

const numeric=value=>Number.isFinite(Number(value))?Math.max(0,Math.trunc(Number(value))):0;
const number=value=>numeric(value).toLocaleString('en-US');
const currencies=[
 ['🍪','Treats','treats'],
 ['🦴','Bones','bones'],
 ['🪙','Pup Coins','pupCoins'],
 ['🐾','Casino Chips','casinoChips']
];
const accessoryIcons={Bandana:'🧣',Bow:'🎀',Crown:'👑'};
const rarityIcons={COMMON:'⚪',UNCOMMON:'🟢',RARE:'🔵',EPIC:'🟣',LEGENDARY:'🟡'};
const sections=[
 ['puppies','🐶','Puppies'],
 ['accessories','🎀','Accessories'],
 ['tickets','🎟️','Tickets'],
 ['upgrades','⬆️','Upgrades'],
 ['wallet','🍪','Wallet']
];
const puppyInfo=new Map(LEGACY_V6_PUPPIES.map(p=>[p.id,p]));
const puppyGroup=p=>p.groupId==='test'||p.id.startsWith('test_')?'Test Puppies':
 p.groupId==='v2'||p.id.startsWith('v2_')&&p.id!=='v2_discord_pup'?'V2 Puppies':
 p.id==='v2_discord_pup'?'Community':'V1 Puppies';
const puppyDisplay=(p,game)=>game.puppyNames?.[p.id]||(p.id===game.puppyStyle?game.puppyName:p.name);
const artworkUri=p=>{
 const image=PUPPY_IMAGES[p.id]?.uri||p.image||'';
 return image.replace(/^\/assets\/(v1|v2)\//,'/assets/transparent/$1/');
};
const safeRarity=p=>rarityLabels[p.rarity]||'Rarity unavailable';

function InventoryPuppyDetails({puppy,name,onClose,onViewAsset}){
 const ref=useRef(null);
 const [copyStatus,setCopyStatus]=useState('');
 const url=puppyDetailsHref(puppy);
 const assetId=puppyAssetId({...puppy,image:artworkUri(puppy)});
 useEffect(()=>{
  const node=ref.current;
  if(node&&!node.open)node.showModal();
  return()=>{if(node?.open)node.close();};
 },[]);
 const copyLink=async()=>{
  try{
   if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');
   await navigator.clipboard.writeText(new URL(url,window.location.origin).href);
   setCopyStatus('Puppy link copied!');
  }catch{setCopyStatus('Clipboard unavailable. Use Open in PupDex to share this puppy.');}
 };
 return <dialog ref={ref} className="meet-puppy-dialog pup-inventory-detail-dialog"
  aria-labelledby="pup-inventory-detail-title"
  onCancel={event=>{event.preventDefault();onClose();}}
  onClick={event=>{if(event.target===ref.current)onClose();}}>
  <div className="meet-puppy-dialog-inner">
   <header className="meet-detail-heading">
    <h2 id="pup-inventory-detail-title">Owned Puppy Details</h2>
    <button type="button" className="meet-detail-close" onClick={onClose} aria-label="Close puppy details">×</button>
   </header>
   <div className="meet-detail-main">
    <div className="meet-detail-identity" data-rarity={puppy.rarity||'unknown'}>
     <div className="meet-detail-artwork">
      <PuppyArtwork id={puppy.id} name={name+' puppy artwork'}
       uri={artworkUri(puppy)} size={164} fullResolution/>
     </div>
     <div className="meet-detail-name">
      <h3>{name}</h3><p className="meet-detail-asset-id">{assetId}</p>
      <div className="meet-detail-pills">
       <span>{puppyGroup(puppy)}</span>
       <span className="meet-detail-rarity">{safeRarity(puppy)}</span>
       <span>{unlockText(puppy.rarity?puppy:null)}</span>
       <span className="pup-inventory-owned-pill">Owned</span>
       {puppy.current&&<span>Current puppy</span>}
       {puppy.favorite&&<span>♥ Favorite</span>}
      </div>
     </div>
    </div>
    <div className="meet-detail-aside">
     <section className="meet-detail-about">
      <h3>About</h3>
      <p>{puppy.description||'This puppy is in your protected Pup Account collection.'}</p>
      {puppy.rarity&&<p className="pup-inventory-transfer">{transferText(puppy)}</p>}
     </section>
     <div className="meet-detail-actions" aria-label="Owned puppy tools">
      <button type="button" className="meet-detail-secondary" onClick={()=>void copyLink()}>Copy Link</button>
      <button type="button" className="meet-detail-secondary" onClick={onViewAsset}>View Asset</button>
     </div>
     {copyStatus&&<p className="meet-detail-copy-status" role="status">{copyStatus}</p>}
     <p className="meet-detail-disclaimer">Inventory is read-only. Use the game Roster to switch puppies or update favorites.</p>
     <div className="meet-detail-main-actions">
      <a href={url} className="meet-detail-primary">Open in PupDex</a>
      <button type="button" className="meet-detail-done" onClick={onClose}>Done</button>
     </div>
    </div>
   </div>
  </div>
 </dialog>;
}

function OwnedPuppyCard({puppy,game,onInspect}){
 const name=puppyDisplay(puppy,game);
 const current=game.puppyStyle===puppy.id;
 const favorite=Array.isArray(game.favoritePuppies)&&game.favoritePuppies.includes(puppy.id);
 return <PuppyCollectionCard puppy={puppy} name={name} image={artworkUri(puppy)} group={puppyGroup(puppy)}
  rarity={puppy.rarity||'unknown'} unlock={unlockText(puppy.rarity?puppy:null)}
  statuses={[{text:'Owned',className:'meet-puppy-badge-status'},...(current?[{text:'Current',className:'pup-inventory-current-badge'}]:[])]}
  favorite={favorite} cardClass="pup-inventory-puppy" contentClass="pup-inventory-card-content"
  buttonClass="pup-inventory-view" data={{'data-pup-inventory-id':puppy.id,'data-current':String(current)}}
  label={'View '+name+' puppy details'} onSelect={()=>onInspect(puppy.id)}/>;
}

export default function InventoryScreen({game,origin='account',onBack,updatedAt,onRefresh,refreshing=false}){
 const [selected,setSelected]=useState('puppies');
 const [search,setSearch]=useState('');
 const [rarityFilter,setRarityFilter]=useState('all');
 const [sort,setSort]=useState('roster');
 const [detailsId,setDetailsId]=useState(null);
 const [assetId,setAssetId]=useState(null);
 const catalog=usePuppyRarity();
 if(!game)return null;
 const ownedIds=[...new Set(Array.isArray(game.unlockedPuppies)?game.unlockedPuppies:[])].filter(id=>typeof id==='string');
 const knownPuppies=ROSTER.filter(pup=>ownedIds.includes(pup.id)).map(pup=>{
  const row=catalog.rows.find(item=>item.puppy_id===pup.id);
  const legacy=puppyInfo.get(pup.id);
  return {...pup,...row,description:legacy?.description||pup.description,
   emoji:legacy?.emoji||'🐾',current:pup.id===game.puppyStyle,
   favorite:game.favoritePuppies?.includes(pup.id)||false};
 });
 const otherPuppies=ownedIds.filter(id=>!ROSTER.some(pup=>pup.id===id));
 const accessories=[...new Set(Array.isArray(game.ownedAccessories)?game.ownedAccessories:[])].filter(name=>typeof name==='string'&&name!=='None');
 const purchasedUpgrades=UPGRADES.filter(upgrade=>numeric(game.upgrades?.[upgrade.id])>0);
 const filter=search.trim().toLowerCase();
 const visiblePuppies=knownPuppies.filter(pup=>
  (rarityFilter==='all'||pup.rarity===rarityFilter)&&
  (pup.name+' '+(game.puppyNames?.[pup.id]||'')+' '+pup.id+' '+puppyGroup(pup)).toLowerCase().includes(filter))
  .sort((a,b)=>sort==='name'?puppyDisplay(a,game).localeCompare(puppyDisplay(b,game)):
   sort==='rarity'?(rarityOrder.indexOf(b.rarity)-rarityOrder.indexOf(a.rarity)):
   sort==='favorites'?Number(game.favoritePuppies?.includes(b.id))-Number(game.favoritePuppies?.includes(a.id)):
   a.number-b.number);
 const visibleOther=rarityFilter==='all'?otherPuppies.filter(id=>id.toLowerCase().includes(filter)):[];
 const counts={puppies:ownedIds.length,accessories:accessories.length,tickets:RARITIES.reduce((n,r)=>n+numeric(game.ticketInventory?.[r]),0),upgrades:purchasedUpgrades.length,wallet:4};
 const safeDate=updatedAt&&!Number.isNaN(new Date(updatedAt).valueOf())?new Date(updatedAt).toLocaleString():null;
 const inspectedPuppy=detailsId?knownPuppies.find(p=>p.id===detailsId):null;
 const viewerPuppy=assetId?knownPuppies.find(p=>p.id===assetId):null;
 const closeDetails=()=>{setDetailsId(null);setAssetId(null);};
 return <section className={'pup-inventory '+(origin==='play'?'pup-inventory-play':'pup-inventory-account')}
  aria-label="Puppy Clicker Inventory" data-testid="pup-inventory">
  <header className="pup-inventory-heading">
   <div><p className="pup-inventory-eyebrow">🎒 PUP ACCOUNT COLLECTION</p>
    <h1>Inventory</h1><p>Your owned puppies, items and balances from your protected game progress.</p>
   </div>
   <div className="pup-inventory-actions">
    {onBack?<button type="button" className="pup-inventory-button" onClick={onBack}>← Back to game</button>:
     <a className="pup-inventory-button" href="/account">← Account</a>}
    {onRefresh?<button type="button" className="pup-inventory-button primary" disabled={refreshing} onClick={onRefresh}>{refreshing?'Refreshing…':'↻ Refresh'}</button>:null}
   </div>
  </header>
  <div className="pup-inventory-stats" aria-label="Inventory totals">
   <div><span>🐶 Puppies</span><strong>{number(ownedIds.length)}</strong></div>
   <div><span>🎀 Accessories</span><strong>{number(accessories.length)}</strong></div>
   <div><span>🎟️ Tickets</span><strong>{number(counts.tickets)}</strong></div>
   <div><span>⬆️ Upgrade types</span><strong>{number(purchasedUpgrades.length)}</strong></div>
  </div>
  <nav className="pup-inventory-tabs" aria-label="Inventory categories">
   {sections.map(([id,emoji,label])=><button key={id} type="button" aria-current={selected===id?'page':undefined}
    className={selected===id?'active':''} onClick={()=>setSelected(id)}>
    {emoji} {label}<span>{number(counts[id])}</span></button>)}
  </nav>
  <div className="pup-inventory-panel">
   {selected==='puppies'?<>
    <div className="pup-inventory-section-head">
     <div><h2>🐶 Puppy collection</h2>
      <p>Only puppies owned by this Pup Account. Switch puppies in the game Roster.</p>
     </div>
     <div className="pup-inventory-filter-controls">
      <label className="pup-inventory-search">Search puppies
       <input type="search" value={search} onChange={event=>setSearch(event.target.value)}
        placeholder="Name or asset ID…" aria-label="Search inventory puppies"/>
      </label>
      <label>Rarity
       <select value={rarityFilter} onChange={event=>setRarityFilter(event.target.value)}
        aria-label="Filter inventory by rarity">
        <option value="all">All rarities</option>
        {rarityOrder.map(key=><option key={key} value={key}>{rarityLabels[key]}</option>)}
       </select>
      </label>
      <label>Sort
       <select value={sort} onChange={event=>setSort(event.target.value)} aria-label="Sort inventory puppies">
        <option value="roster">Roster order</option>
        <option value="rarity">Rarity</option>
        <option value="name">Name A–Z</option>
        <option value="favorites">Favorites first</option>
       </select>
      </label>
     </div>
    </div>
    {catalog.error&&<p className="pup-inventory-notice" role="status">Rarity catalog is temporarily unavailable; your owned puppies are still shown without guessed rarity labels.</p>}
    <p className="pup-inventory-count" aria-live="polite">{visiblePuppies.length+visibleOther.length} of {ownedIds.length} owned puppies</p>
    {visiblePuppies.length||visibleOther.length?<div className="pup-inventory-puppies">
     {visiblePuppies.map(pup=><OwnedPuppyCard key={pup.id} puppy={pup} game={game} onInspect={setDetailsId}/>)}
     {visibleOther.map(id=><article key={id} className="pup-inventory-unknown">
      <div className="pup-inventory-art" aria-hidden="true">🐾</div>
      <div><strong>{game.puppyNames?.[id]||id.replaceAll('_',' ')}</strong>
       <small>Owned puppy · artwork and rarity unavailable</small>
      </div>
      <span className="meet-puppy-badge meet-puppy-badge-status">Owned</span>
     </article>)}
    </div>:<div className="pup-inventory-empty"><p>No owned puppies match these filters.</p>
     <button type="button" className="pup-inventory-button" onClick={()=>{setSearch('');setRarityFilter('all');setSort('roster');}}>Reset filters</button>
    </div>}
   </>:null}
   {selected==='accessories'?<>
    <div className="pup-inventory-section-head"><div><h2>🎀 Accessories</h2>
     <p>Purchased accessories are permanent. Equip them in the game Shop.</p></div></div>
    {accessories.length?<div className="pup-inventory-items">
     {accessories.map(name=><article className="pup-inventory-item" data-rarity="neutral" key={name}>
      <span className="pup-inventory-item-icon" aria-hidden="true">{accessoryIcons[name]||'🎁'}</span>
      <div><strong>{name}</strong><small>Owned permanently</small></div>
      {game.accessory===name?<span className="pup-inventory-equipped">Equipped</span>:<span className="meet-puppy-badge meet-puppy-badge-status">Owned</span>}
     </article>)}
    </div>:<p className="pup-inventory-empty">No purchased accessories yet. Visit the Shop to collect some.</p>}
   </>:null}
   {selected==='tickets'?<>
    <div className="pup-inventory-section-head"><div><h2>🎟️ Upgrade tickets</h2>
     <p>Ticket colors match their rarity. Spend them on eligible Shop upgrades.</p></div></div>
    <div className="pup-inventory-items">
     {RARITIES.map(rarity=><article className="pup-inventory-item" data-rarity={rarity.toLowerCase()} key={rarity}>
      <span className="pup-inventory-item-icon" aria-hidden="true">{rarityIcons[rarity]}</span>
      <div><strong>{rarity.charAt(0)+rarity.slice(1).toLowerCase()} ticket</strong>
       <small>{rarityLabels[rarity.toLowerCase()]}</small></div>
      <b>×{number(game.ticketInventory?.[rarity])}</b>
     </article>)}
    </div>
   </>:null}
   {selected==='upgrades'?<>
    <div className="pup-inventory-section-head"><div><h2>⬆️ Purchased upgrades</h2>
     <p>Only purchased upgrade levels, not Shop offers.</p></div></div>
    {purchasedUpgrades.length?<div className="pup-inventory-items">
     {purchasedUpgrades.map(upgrade=><article key={upgrade.id} className="pup-inventory-item"
      data-rarity={upgrade.rarity?.toLowerCase()||'neutral'}>
      <span className="pup-inventory-item-icon" aria-hidden="true">{upgrade.emoji}</span>
      <div><strong>{upgrade.name}</strong><small>{upgrade.description}</small>
       {upgrade.rarity?<span className="pup-inventory-item-rarity">{rarityLabels[upgrade.rarity.toLowerCase()]}</span>:null}
      </div><b>Lv. {number(game.upgrades[upgrade.id])}</b>
     </article>)}
    </div>:<p className="pup-inventory-empty">You haven't purchased any upgrades yet.</p>}
   </>:null}
   {selected==='wallet'?<>
    <div className="pup-inventory-section-head"><div><h2>🍪 Wallet</h2>
     <p>Current protected game balances. Viewing inventory never changes them.</p></div></div>
    <div className="pup-inventory-items">
     {currencies.map(([emoji,label,key])=><article className="pup-inventory-item" data-rarity="neutral" key={key}>
      <span className="pup-inventory-item-icon" aria-hidden="true">{emoji}</span>
      <div><strong>{label}</strong><small>Available balance</small></div>
      <b>{number(game[key])}</b>
     </article>)}
    </div>
   </>:null}
  </div>
  <footer className="pup-inventory-footer">
   <span>🔒 Read-only inventory · Your protected cloud save remains the source of truth.</span>
   {safeDate?<span>Last server save: {safeDate}</span>:null}
   <span className="pup-inventory-shortcuts"><a className="pup-link-button" href="/play">Open game</a><a className="pup-link-button" href="/account">Pup Account</a></span>
  </footer>
  {inspectedPuppy&&<InventoryPuppyDetails key={inspectedPuppy.id} puppy={inspectedPuppy}
   name={puppyDisplay(inspectedPuppy,game)}
   onClose={closeDetails} onViewAsset={()=>setAssetId(inspectedPuppy.id)}/>}
  {viewerPuppy&&<WebPlayPuppyAssetViewer key={viewerPuppy.id} puppy={viewerPuppy}
   assetId={puppyAssetId({...viewerPuppy,image:artworkUri(viewerPuppy)})}
   name={puppyDisplay(viewerPuppy,game)} onClose={()=>setAssetId(null)}/>}
 </section>;
}

export function AccountInventoryPage(){
 const {client,pupAccount}=useWebAccount();
 const [request,setRequest]=useState(0);
 const [result,setResult]=useState({loading:true,game:null,updatedAt:null,error:''});
 useEffect(()=>{
  let active=true;
  setResult({loading:true,game:null,updatedAt:null,error:''});
  const load=async()=>{
   try{
    if(!client||!pupAccount?.id)throw new Error('ACCOUNT_REQUIRED');
    const {data,error}=await client.functions.invoke('pup-web-auth',{body:{action:'cloud-save-read'},timeout:15000});
    if(error||data?.verified!==true||data.account?.id!==pupAccount.id)throw new Error('CLOUD_READ_FAILED');
    if(!data.cloud?.exists){
     if(active)setResult({loading:false,game:null,updatedAt:null,error:'No linked cloud game save was found. Sync your Puppy Clicker progress on Android first.'});
     return;
    }
    const game=projectKotlinCloudSave(data.cloud.saveJson,data.account.displayName);
    if(active)setResult({loading:false,game,updatedAt:data.cloud.updatedAt||null,error:''});
   }catch{
    if(active)setResult({loading:false,game:null,updatedAt:null,error:'Your protected inventory could not be loaded. Check your account connection and try again.'});
   }
  };
  void load();
  return()=>{active=false;};
 },[client,pupAccount?.id,request]);
 return <div className="pup-inventory-account-wrap" data-testid="account-inventory-page">
  {result.game?<InventoryScreen game={result.game} origin="account" updatedAt={result.updatedAt} onRefresh={()=>setRequest(n=>n+1)} refreshing={result.loading}/>:
  <section className="pup-inventory-status" role="status"><p className="pup-inventory-eyebrow">🎒 PUP ACCOUNT COLLECTION</p><h1>Inventory</h1>
   <p>{result.loading?'Loading your verified inventory…':result.error}</p>
   {!result.loading?<div className="pup-inventory-actions"><button type="button" className="pup-inventory-button primary" onClick={()=>setRequest(n=>n+1)}>Try again</button><a href="/account" className="pup-inventory-button">← Back to account</a></div>:null}
  </section>}
 </div>;
}
