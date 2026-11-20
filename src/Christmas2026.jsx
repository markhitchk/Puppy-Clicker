import React,{useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
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
function ChristmasTree({className}){
 return <svg className={className} viewBox="0 0 160 220" aria-hidden="true" focusable="false">
  <ellipse cx="80" cy="207" rx="73" ry="10" fill="#c7ecff" opacity=".56"/>
  <path d="M71 166h18v37H71z" fill="#765048"/>
  <path d="m80 18-38 58h15L26 119h18L9 176q71 34 142 0l-35-57h18l-31-43h15z" fill="#185c50" stroke="#9fd6c9" strokeWidth="1.5"/>
  <path d="M80 20 42 76q38 10 76 0M26 119q54 15 108 0M9 176q71 26 142 0" fill="none" stroke="#d7f5ef" strokeWidth="5" strokeLinecap="round"/>
  <path d="M51 76q24 21 59 12M38 120q43 31 83 10M23 164q56 31 116 0" fill="none" stroke="#efc97c" strokeWidth="2.5" strokeDasharray="2 7" strokeLinecap="round"/>
  {[[62,67,'#ef7e8b'],[98,89,'#b6eaff'],[51,109,'#ffcf7a'],[80,115,'#f19bbd'],[105,135,'#b6eaff'],[39,154,'#ef7e8b'],[75,151,'#ffcf7a'],[121,167,'#ef9cb8'],[64,174,'#b6eaff']].map(([x,y,c])=><circle key={x+':'+y} cx={x} cy={y} r="5" fill={c} stroke="#eafafa" strokeOpacity=".6"/>)}
  <path d="m80 2 4 10 11 1-8 7 2 11-9-6-9 6 2-11-8-7 11-1z" fill="#ffe3a1" stroke="#fff5ce"/>
  <rect x="11" y="181" width="32" height="24" rx="3" fill="#ab395b"/><path d="M24 181h6v24" stroke="#ffdc9d" strokeWidth="4"/>
  <rect x="116" y="187" width="34" height="19" rx="3" fill="#467ea6"/><path d="M130 187h6v19" stroke="#c1f5ff" strokeWidth="4"/>
 </svg>;
}
// Fixed viewport overlay bypasses scroll containers and stacking contexts.
const snowFlakes=Array.from({length:42},(_,i)=>({
 left:((i*37+13)%101)+'%',size:3+(i%5),duration:7+(i*3%10),
 delay:-(i*19%170)/10,drift:(i%2?1:-1)*(14+i%22),opacity:.46+(i%5)*.12
}));
export function WinterSnow(){
 if(typeof document==='undefined')return null;
 return createPortal(<div className="xmas26-snow-overlay" aria-hidden="true" data-testid="winter-snow">
  {[0,1].map(layer=><div key={layer} className={'xmas26-snow-layer'+(layer?' xmas26-snow-layer-b':'')}>{snowFlakes.slice(layer*21,(layer+1)*21).map((f,i)=><span key={i} className="xmas26-flake" style={{left:f.left,width:f.size,height:f.size,'--flake-duration':f.duration+'s','--flake-delay':f.delay+'s','--flake-drift':f.drift+'px','--flake-opacity':f.opacity}}/>)}</div>)}
 </div>,document.body);
}
function WinterDecor(){
 return <><WinterSnow/><div className="xmas26-decor" aria-hidden="true">
  <div className="xmas26-lights">{Array.from({length:24},(_,i)=><i key={i} style={{'--light-color':['#ff9ab0','#fce5a0','#9be8ff','#a8edc6'][i%4]}}/>)}</div>
 </div></>;
}
function useClock(){
 const [clock,setClock]=useState(Date.now);
 useEffect(()=>{const timer=setInterval(()=>setClock(Date.now()),1000);return()=>clearInterval(timer);},[]);
 return clock;
}
function GuestCalendar({onSignIn}){
 const clock=useClock();
 const [preferences,setPreferences]=useState(()=>loadWebPreferences());
 function act(action){
  if(action.type!=='setPreference')return;
  const next=updateWebPreference(preferences,action.name,action.value);
  saveWebPreferences(next);setPreferences(next);
 }
 return <><WebAdventCalendar game={{...preferences,adventClaims:[]}} act={act} clock={clock} readOnly showTheme={false} guest/>
  <button className="xmas26-primary" type="button" onClick={onSignIn}>Sign in to collect gifts</button></>;
}
function AccountCalendar(){
 const clock=useClock();
 const {state,act,account,syncStatus,refreshAccount}=useGame();
 const game=state.game;
 return <><WebAdventCalendar game={game} act={act} clock={clock} showTheme={false} readOnly={account?.gameplayWritable!==true||!Number.isFinite(game.adventClockOffset)}/>
  {state.notice&&<p role="status">{state.notice}</p>}
  {syncStatus.errorCode&&<p role="status">Cloud sync: {syncStatus.errorCode}</p>}
  <button className="xmas26-secondary" type="button" onClick={()=>void refreshAccount()}>Refresh account rewards</button></>;
}
const total=ADVENT_REWARDS.reduce((a,r)=>({treats:a.treats+r.treats,bones:a.bones+r.bones,coins:a.coins+r.coins}),{treats:0,bones:0,coins:0});
export default function Christmas2026(){
 const [collect,setCollect]=useState(()=>new URLSearchParams(window.location.search).get('collect')==='1');
 function requestSignIn(){
  const url=new URL(window.location.href);
  url.searchParams.set('collect','1');
  window.history.replaceState(window.history.state,'',url.pathname+url.search+url.hash);
  setCollect(true);
 }
 const [theme,setTheme]=useState(()=>loadWebPreferences().seasonalTheme==='winter');
 const [decor,setDecor]=useState(true);
 useEffect(()=>{
  const sync=()=>setTheme(loadWebPreferences().seasonalTheme==='winter');
  window.addEventListener('puppy-clicker:web-preferences-changed',sync);
  return()=>window.removeEventListener('puppy-clicker:web-preferences-changed',sync);
 },[]);
 function toggleTheme(){
  const next=updateWebPreference(loadWebPreferences(),'seasonalTheme',theme?'default':'winter');
  saveWebPreferences(next);setTheme(next.seasonalTheme==='winter');
 }
 return <div className="xmas26-page" data-winter-decor={decor}>
   {decor&&<WinterDecor/>}
   <header className="xmas26-hero">
    <div className="xmas26-hero-copy">
     <span className="xmas26-kicker">PUPPY CLICKER · SEASONAL EVENT</span>
     <h1>Santa Paws Christmas 2026</h1>
     <p>December 1–25 · 25 festive gifts</p>
     <div className="xmas26-actions">
      <button className="xmas26-primary" type="button" onClick={()=>document.getElementById('xmas26-calendar')?.scrollIntoView({block:'start'})}>🎁 Calendar</button>
      <button className="xmas26-secondary" type="button" onClick={()=>setDecor(v=>!v)} aria-pressed={decor}>{decor?'❄ Hide winter effects':'❄ Show winter effects'}</button>
     </div>
    </div>
    <div className="xmas26-hero-scene">{decor&&<><ChristmasTree className="xmas26-tree tree-left"/><ChristmasTree className="xmas26-tree tree-right"/><span className="xmas26-snowbank" aria-hidden="true"/></>}<PuppyArtwork id="santa" name="Santa Paws" uri="/assets/transparent/v1/v1_santa.png" size={100}/></div>
   </header>
   <section className="xmas26-stats" aria-label="Event rewards">
    <div><strong>25</strong><span>Gift doors</span></div>
    <div><strong>{total.treats.toLocaleString('en-US')}</strong><span>Total Treats</span></div>
    <div><strong>{total.bones}</strong><span>Total Bones</span></div>
    <div><strong>{total.coins}</strong><span>Total Pup Coins</span></div>
   </section>
   <div className="xmas26-layout">
    <div className="xmas26-calendar" id="xmas26-calendar">
     <WebAccountGate compact guestFallback={collect?null:<GuestCalendar onSignIn={requestSignIn}/>}>
      <AccountCalendar/>
     </WebAccountGate>
    </div>
    <aside className="xmas26-side">
     <section className="xmas26-panel"><span className="xmas26-kicker">DECEMBER 25</span><h2>🎁 Christmas jackpot</h2><p>10,000 Treats · 50 Bones · 50 Pup Coins</p><p>Collect the final gift on Christmas Day.</p></section>
     <section className="xmas26-panel"><h2>❄ Winter theme</h2><p>Snow falls across Puppy Clicker by default. Christmas trees and festive lights are exclusive to this event page. The optional winter theme changes the website colors.</p><button type="button" className="xmas26-secondary" aria-pressed={theme} onClick={toggleTheme}>{theme?'Winter theme enabled · turn off':'Enable winter theme'}</button></section>
     <section className="xmas26-panel"><h2>Event rules</h2><p>Doors unlock at midnight UTC. Catch up on missed days through December 25. Every gift can be collected once per Pup Account.</p></section>
    </aside>
   </div>
   <section className="xmas26-collection"><div><span className="xmas26-kicker">PUPDEX COLLECTION</span><h2>Winter puppies</h2><p>Meet the seasonal catalog. Featured puppies are not automatically granted by the calendar.</p></div><div className="xmas26-pups">
    {puppies.map(p=><article className="xmas26-pup" key={p.id}><PuppyArtwork id={p.id} name={p.name} uri={'/assets/transparent/'+p.group+'/'+p.asset+'.png'} size={140} lazy/><h3>{p.name}</h3><p>{p.description}</p><button className="xmas26-secondary" type="button" onClick={()=>window.location.assign('/pupdex?pup='+encodeURIComponent(p.asset))}>View in PupDex</button></article>)}
   </div></section>
   <div className="xmas26-actions"><button className="xmas26-secondary" type="button" onClick={()=>window.location.assign('/play')}>Back to Puppy Clicker</button></div>
 </div>;
}
