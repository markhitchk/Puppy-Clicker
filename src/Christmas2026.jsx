import React,{useEffect,useState} from 'react';
import WebAccountGate from './native/web/AccountGate.jsx';
import {useGame} from './native/src/state/useGame.js';
import WebAdventCalendar from './native/web/WebAdventCalendar.jsx';
import PuppyArtwork from './native/web/PuppyArtwork.jsx';
import {loadWebPreferences,saveWebPreferences,updateWebPreference} from './native/web/preferences.js';
import {ADVENT_REWARDS} from '../supabase/functions/_shared/advent-calendar.js';
import './Christmas2026.css';

const puppies=[
 {id:'santa',asset:'v1_santa',name:'Santa Paws',description:'Limited Christmas red-and-snow puppy.',group:'v1'},
 {id:'snowball',asset:'v1_snowball',name:'Snowball',description:'Snow-white fur with an icy blue look.',group:'v1'},
 {id:'v2_frost',asset:'v2_frost',name:'Frost',description:'Fluffy white puppy with bright pink ears.',group:'v2'}
];
function useClock(){
 const [clock,setClock]=useState(Date.now);
 useEffect(()=>{const timer=setInterval(()=>setClock(Date.now()),1000);return()=>clearInterval(timer);},[]);
 return clock;
}
function GuestCalendar(){
 const clock=useClock();
 const [preferences,setPreferences]=useState(()=>loadWebPreferences());
 function act(action){
  if(action.type!=='setPreference')return;
  const next=updateWebPreference(preferences,action.name,action.value);
  saveWebPreferences(next);setPreferences(next);
 }
 return <><WebAdventCalendar game={{...preferences,adventClaims:[]}} act={act} clock={clock} readOnly/>
  <button className="xmas26-primary" type="button" onClick={()=>window.location.assign('/26xmas?collect=1')}>Sign in to collect gifts</button></>;
}
function AccountCalendar(){
 const clock=useClock();
 const {state,act,account,syncStatus,refreshAccount}=useGame();
 const game=state.game;
 return <><WebAdventCalendar game={game} act={act} clock={clock} readOnly={account?.gameplayWritable!==true||!Number.isFinite(game.adventClockOffset)}/>
  {state.notice&&<p role="status">{state.notice}</p>}
  {syncStatus.errorCode&&<p role="status">Cloud sync: {syncStatus.errorCode}</p>}
  <button className="xmas26-secondary" type="button" onClick={()=>void refreshAccount()}>Refresh account rewards</button></>;
}
const total=ADVENT_REWARDS.reduce((a,r)=>({treats:a.treats+r.treats,bones:a.bones+r.bones,coins:a.coins+r.coins}),{treats:0,bones:0,coins:0});
export default function Christmas2026(){
 const collect=new URLSearchParams(window.location.search).get('collect')==='1';
 const [theme,setTheme]=useState(()=>loadWebPreferences().seasonalTheme==='winter');
 useEffect(()=>{
  const sync=()=>setTheme(loadWebPreferences().seasonalTheme==='winter');
  window.addEventListener('puppy-clicker:web-preferences-changed',sync);
  return()=>window.removeEventListener('puppy-clicker:web-preferences-changed',sync);
 },[]);
 function toggleTheme(){
  const next=updateWebPreference(loadWebPreferences(),'seasonalTheme',theme?'default':'winter');
  saveWebPreferences(next);setTheme(next.seasonalTheme==='winter');
 }
 return <div className="xmas26-page">
   <header className="xmas26-hero">
    <div className="xmas26-hero-copy">
     <span className="xmas26-kicker">PUPPY CLICKER · SEASONAL EVENT</span>
     <h1>Santa Paws<br/>Christmas 2026</h1>
     <p>December 1–25 · 25 days of treats, gifts and festive puppies.</p>
     <div className="xmas26-actions">
      <button className="xmas26-primary" type="button" onClick={()=>document.getElementById('xmas26-calendar')?.scrollIntoView({block:'start'})}>🎁 Advent Calendar</button>
      <button className="xmas26-secondary" type="button" onClick={toggleTheme} aria-pressed={theme}>{theme?'Disable winter theme':'❄ Enable winter theme'}</button>
     </div>
    </div>
    <PuppyArtwork id="santa" name="Santa Paws" uri="/assets/transparent/v1/v1_santa.png" size={240}/>
   </header>
   <section className="xmas26-stats" aria-label="Event rewards">
    <div><strong>25</strong><span>Gift doors</span></div>
    <div><strong>{total.treats.toLocaleString('en-US')}</strong><span>Total Treats</span></div>
    <div><strong>{total.bones}</strong><span>Total Bones</span></div>
    <div><strong>{total.coins}</strong><span>Total Pup Coins</span></div>
   </section>
   <div className="xmas26-layout">
    <div className="xmas26-calendar" id="xmas26-calendar">
     {collect?<WebAccountGate><AccountCalendar/></WebAccountGate>:<GuestCalendar/>}
    </div>
    <aside className="xmas26-side">
     <section className="xmas26-panel"><span className="xmas26-kicker">DECEMBER 25</span><h2>🎁 Christmas jackpot</h2><p>10,000 Treats · 50 Bones · 50 Pup Coins</p><p>Collect the final gift on Christmas Day.</p></section>
     <section className="xmas26-panel"><h2>❄ Winter theme</h2><p>Switch on the optional winter appearance for this browser.</p><button type="button" className="xmas26-secondary" aria-pressed={theme} onClick={toggleTheme}>{theme?'Winter theme enabled · turn off':'Enable winter theme'}</button></section>
     <section className="xmas26-panel"><h2>Event rules</h2><p>Doors unlock at midnight UTC. Catch up on missed days through December 25. Every gift can be collected once per Pup Account.</p></section>
    </aside>
   </div>
   <section className="xmas26-collection"><div><span className="xmas26-kicker">PUPDEX COLLECTION</span><h2>Winter puppies</h2><p>Meet the seasonal catalog. Featured puppies are not automatically granted by the calendar.</p></div><div className="xmas26-pups">
    {puppies.map(p=><article className="xmas26-pup" key={p.id}><PuppyArtwork id={p.id} name={p.name} uri={'/assets/transparent/'+p.group+'/'+p.asset+'.png'} size={140} lazy/><h3>{p.name}</h3><p>{p.description}</p><button className="xmas26-secondary" type="button" onClick={()=>window.location.assign('/pupdex?pup='+encodeURIComponent(p.asset))}>View in PupDex</button></article>)}
   </div></section>
   <div className="xmas26-actions"><button className="xmas26-secondary" type="button" onClick={()=>window.location.assign('/play')}>Back to Puppy Clicker</button></div>
 </div>;
}
