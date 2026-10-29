import React from 'react';

export default function DesktopNavigation({tabs,route,onOpen}){
 return <aside className="desktop-navigation" data-testid="desktop-navigation">
  <a href="/" className="desktop-brand" aria-label="Puppy Clicker home"><img src="/assets/logos/puppy_clicker.png" alt=""/><span>Puppy<br/>Clicker</span></a>
  <nav aria-label="Game navigation" className="desktop-main-nav"><a href="/" className="desktop-home-link" aria-label="Home"><span aria-hidden="true">🏠</span><strong>Home</strong></a>{tabs.map(([id,icon,label])=><button type="button" key={id} aria-label={label} aria-current={route===id?'page':undefined} onClick={()=>onOpen(id)}><span aria-hidden="true">{icon}</span><strong>{label}</strong></button>)}</nav>
  <div className="desktop-nav-spacer"/>
  <nav aria-label="Support and more" className="desktop-support-nav">
   <details className="desktop-more"><summary>More game modes</summary><div><button type="button" aria-label="Casino" onClick={()=>onOpen('casino')}>🎰 Casino</button><button type="button" aria-label="Exchange" onClick={()=>onOpen('exchange')}>🎁 Exchange</button></div></details>
   <button type="button" aria-label="Settings" aria-current={route==='settings'?'page':undefined} onClick={()=>onOpen('settings')}><span aria-hidden="true">⚙️</span>Settings</button>
   <button type="button" aria-label="Help" aria-current={route==='help'?'page':undefined} onClick={()=>onOpen('help')}><span aria-hidden="true">❔</span>Help</button>
   <a href="https://discord.gg/HcZweHchbv" target="_blank" rel="noreferrer"><span aria-hidden="true">💬</span>Discord</a>
  </nav>
  <nav className="desktop-site-links" aria-label="Website"><a href="/">Home</a><span aria-hidden="true">·</span><a href="/account">Account</a></nav>
 </aside>;
}

export function DesktopHelp({onOpen}){
 return <section className="web-settings"><header><h1>Puppy Clicker Help</h1><p>Your puppy adventure, in the browser.</p></header><div className="cyber-panel"><h2>Tap, care, collect</h2><p>Tap your puppy to earn Treats. Keep energy above 10% with Pup Care, and improve wellness and bond for a care bonus. Browse your unlocked puppies in Roster, buy upgrades in Shop, and claim completed goals in Rewards.</p><div className="web-setting-actions"><button className="cyber-button secondary" onClick={()=>onOpen('care')}>Open Pup Care</button><button className="cyber-button secondary" onClick={()=>onOpen('rewards')}>Goals & rewards</button></div></div><div className="cyber-panel"><h2>Your Pup Account</h2><p>Confirmed gameplay actions save to your signed-in Pup Account. Browser appearance preferences stay on this device. Check Website Settings if your save connection needs attention.</p><button className="cyber-button secondary" onClick={()=>onOpen('settings')}>Website Settings</button></div></section>;
}
