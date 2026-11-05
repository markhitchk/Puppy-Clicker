import React,{useEffect,useState} from 'react';
import {ROSTER,UPGRADES,RARITIES} from './native/src/engine/game.js';
import PuppyArtwork from './native/web/PuppyArtwork.jsx';
import {useWebAccount} from './native/web/AccountGate.jsx';
import {projectKotlinCloudSave} from './native/src/production/kotlinCloudPreview.js';
import './InventoryScreen.css';

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

export default function InventoryScreen({game,origin='account',onBack,updatedAt,onRefresh,refreshing=false}){
 const [selected,setSelected]=useState('puppies');
 const [search,setSearch]=useState('');
 if(!game)return null;
 const ownedIds=[...new Set(Array.isArray(game.unlockedPuppies)?game.unlockedPuppies:[])].filter(id=>typeof id==='string');
 const knownPuppies=ROSTER.filter(pup=>ownedIds.includes(pup.id));
 const otherPuppies=ownedIds.filter(id=>!ROSTER.some(pup=>pup.id===id));
 const accessories=[...new Set(Array.isArray(game.ownedAccessories)?game.ownedAccessories:[])].filter(name=>typeof name==='string'&&name!=='None');
 const purchasedUpgrades=UPGRADES.filter(upgrade=>numeric(game.upgrades?.[upgrade.id])>0);
 const filter=search.trim().toLowerCase();
 const visiblePuppies=knownPuppies.filter(pup=>(pup.name+' '+(game.puppyNames?.[pup.id]||'')+' '+pup.id).toLowerCase().includes(filter));
 const visibleOther=otherPuppies.filter(id=>id.toLowerCase().includes(filter));
 const counts={puppies:ownedIds.length,accessories:accessories.length,tickets:RARITIES.reduce((n,r)=>n+numeric(game.ticketInventory?.[r]),0),upgrades:purchasedUpgrades.length,wallet:4};
 const safeDate=updatedAt&&!Number.isNaN(new Date(updatedAt).valueOf())?new Date(updatedAt).toLocaleString():null;
 return <section className={'pup-inventory '+(origin==='play'?'pup-inventory-play':'pup-inventory-account')} aria-label="Puppy Clicker Inventory" data-testid="pup-inventory">
  <header className="pup-inventory-heading">
   <div><p className="pup-inventory-eyebrow">🎒 PUP ACCOUNT COLLECTION</p><h1>Inventory</h1><p>Your actual owned puppies, items and balances from your protected game progress.</p></div>
   <div className="pup-inventory-actions">
    {onBack?<button type="button" className="pup-inventory-button" onClick={onBack}>← Back to game</button>:<a className="pup-inventory-button" href="/account">← Account</a>}
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
   {sections.map(([id,emoji,label])=><button key={id} type="button" aria-current={selected===id?'page':undefined} className={selected===id?'active':''} onClick={()=>setSelected(id)}>{emoji} {label}<span>{number(counts[id])}</span></button>)}
  </nav>
  <div className="pup-inventory-panel">
   {selected==='puppies'?<>
    <div className="pup-inventory-section-head"><div><h2>🐶 Puppy collection</h2><p>Currently playing: {game.puppyName||'Your puppy'}. Switch puppies in the Roster screen.</p></div>
     <label className="pup-inventory-search">Search puppies<input type="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search your puppies…" /></label>
    </div>
    {visiblePuppies.length||visibleOther.length?<div className="pup-inventory-puppies">
     {visiblePuppies.map(pup=><article key={pup.id} className="pup-inventory-puppy">
      <div className="pup-inventory-art"><PuppyArtwork id={pup.id} name={pup.name} uri={pup.image} size={105} lazy/></div>
      <div><strong>{game.puppyNames?.[pup.id]|| (pup.id===game.puppyStyle?game.puppyName:pup.name)}</strong><small>{pup.name} · {pup.id.startsWith('v2_')?'V2':pup.id.startsWith('test_')?'Test':'V1'}</small></div>
      <div className="pup-inventory-tags">{pup.id===game.puppyStyle?<span className="is-current">Current</span>:null}{Array.isArray(game.favoritePuppies)&&game.favoritePuppies.includes(pup.id)?<span>♥ Favorite</span>:null}</div>
     </article>)}
     {visibleOther.map(id=><article key={id} className="pup-inventory-puppy"><div className="pup-inventory-art" aria-hidden="true">🐾</div><div><strong>{game.puppyNames?.[id]||id.replaceAll('_',' ')}</strong><small>Owned puppy · artwork unavailable</small></div></article>)}
    </div>:<p className="pup-inventory-empty">No owned puppies match your search.</p>}
   </>:null}
   {selected==='accessories'?<>
    <div className="pup-inventory-section-head"><div><h2>🎀 Accessories</h2><p>Purchased accessories are permanent. Equip them in the Shop.</p></div></div>
    {accessories.length?<div className="pup-inventory-items">
     {accessories.map(name=><article className="pup-inventory-item" key={name}><span className="pup-inventory-item-icon" aria-hidden="true">{accessoryIcons[name]||'🎁'}</span><div><strong>{name}</strong><small>Owned permanently</small></div>{game.accessory===name?<span className="pup-inventory-equipped">Equipped</span>:null}</article>)}
    </div>:<p className="pup-inventory-empty">No purchased accessories yet. Visit the Shop to collect some.</p>}
   </>:null}
   {selected==='tickets'?<>
    <div className="pup-inventory-section-head"><div><h2>🎟️ Upgrade tickets</h2><p>Spend these on eligible Shop upgrades. Quantities reflect your verified game save.</p></div></div>
    <div className="pup-inventory-items">
     {RARITIES.map(rarity=><article className="pup-inventory-item" key={rarity}><span className="pup-inventory-item-icon" aria-hidden="true">{rarityIcons[rarity]}</span><div><strong>{rarity.charAt(0)+rarity.slice(1).toLowerCase()} ticket</strong><small>{rarity.toLowerCase()} rarity</small></div><b>×{number(game.ticketInventory?.[rarity])}</b></article>)}
    </div>
   </>:null}
   {selected==='upgrades'?<>
    <div className="pup-inventory-section-head"><div><h2>⬆️ Purchased upgrades</h2><p>These are your owned upgrade levels, not available Shop offers.</p></div></div>
    {purchasedUpgrades.length?<div className="pup-inventory-items">
     {purchasedUpgrades.map(upgrade=><article key={upgrade.id} className="pup-inventory-item"><span className="pup-inventory-item-icon" aria-hidden="true">{upgrade.emoji}</span><div><strong>{upgrade.name}</strong><small>{upgrade.description}</small></div><b>Lv. {number(game.upgrades[upgrade.id])}</b></article>)}
    </div>:<p className="pup-inventory-empty">You haven't purchased any upgrades yet.</p>}
   </>:null}
   {selected==='wallet'?<>
    <div className="pup-inventory-section-head"><div><h2>🍪 Wallet</h2><p>Current game currency balances. No inventory action changes your balance.</p></div></div>
    <div className="pup-inventory-items">
     {currencies.map(([emoji,label,key])=><article className="pup-inventory-item" key={key}><span className="pup-inventory-item-icon" aria-hidden="true">{emoji}</span><div><strong>{label}</strong><small>Available balance</small></div><b>{number(game[key])}</b></article>)}
    </div>
   </>:null}
  </div>
  <footer className="pup-inventory-footer">
   <span>🔒 Read-only inventory · Your protected cloud save remains the source of truth.</span>
   {safeDate?<span>Last server save: {safeDate}</span>:null}
   <span><a href="/play">Open game</a> · <a href="/account">Pup Account</a></span>
  </footer>
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
