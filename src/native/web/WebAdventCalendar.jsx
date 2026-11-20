import React,{useEffect,useRef,useState} from 'react';
import {ADVENT_START,ADVENT_END,ADVENT_REWARDS,adventClaims,adventDoorState,adventPhase} from '../../../supabase/functions/_shared/advent-calendar.js';
import './WebAdventCalendar.css';
import {adventUnlockTime} from './adventUnlockTime.js';

const money=n=>n.toLocaleString('en-US');
const countdown=ms=>{
 const seconds=Math.max(0,Math.ceil(ms/1000));
 const days=Math.floor(seconds/86400),hours=Math.floor(seconds/3600)%24,minutes=Math.floor(seconds/60)%60;
 return [days&&days+'d',hours+'h',minutes+'m'].filter(Boolean).join(' ');
};
const stateLabels={locked:'Locked',available:'Ready',claimed:'Collected',expired:'Expired'};
const stateIcons={locked:'🔒',available:'✦',claimed:'✓',expired:'–'};
const isMilestone=r=>r.day%5===0||r.day===24;
function GiftArt({reward,opened=false}){
 const special=reward.bonus, milestone=isMilestone(reward);
 const palettes=[['#ef657a','#a52d52','#ffe0a0'],['#44bbae','#196b75','#c4f7ff'],['#7998ef','#434d9f','#e6d8ff'],['#b88ce8','#713ca7','#ffe0b1']];
 const [front,side,ribbon]=special?['#e15567','#9c244d','#ffe3a5']:milestone?['#9f80e8','#5833a2','#a7f1ff']:palettes[(reward.day-1)%4];
 return <svg className="pup-advent-gift" viewBox="0 0 120 112" aria-hidden="true" focusable="false">
  <ellipse cx="60" cy="100" rx="40" ry="7" fill="#000" opacity=".22"/>
  {special&&<><path d="M60 1l3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1z" fill="#ffe7ac"/><circle cx="16" cy="35" r="2.8" fill="#ffe7ac"/><circle cx="104" cy="28" r="2.8" fill="#ffe7ac"/></>}
  <path d="M20 50h80v39Q100 97 92 97H28Q20 97 20 89Z" fill={front}/>
  <path d="M76 50h24v39q0 8-8 8H76Z" fill={side}/>
  <path d="M53 50h15v47H53Z" fill={ribbon}/>
  <g transform={opened?'translate(-9 -8) rotate(-9 60 42)':undefined}>
   <path d="M18 31h84q5 0 5 5v13q0 5-5 5H18q-5 0-5-5V36q0-5 5-5Z" fill={front} stroke="#fff" strokeOpacity=".2" strokeWidth="1.5"/>
   <path d="M77 32h25q5 0 5 5v12q0 5-5 5H77Z" fill={side}/>
   <path d="M52 31h17v23H52Z" fill={ribbon}/>
   <path d="M60 31C34 34 25 17 38 12 48 7 58 23 60 31ZM60 31C86 34 95 17 82 12 72 7 62 23 60 31Z" fill="none" stroke={ribbon} strokeWidth="6" strokeLinejoin="round"/>
   <circle cx="60" cy="30" r="6" fill={ribbon}/>
  </g>
  <path d="M28 61h20M28 66h13" stroke="#fff" strokeOpacity=".23" strokeWidth="2.5" strokeLinecap="round"/>
  {opened&&<path d="m48 77 8 8 17-19" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>}
 </svg>;
}
export default function WebAdventCalendar({game,act,clock,readOnly,showTheme=true,guest=false}){
 const now=clock+(Number.isFinite(game.adventClockOffset)?game.adventClockOffset:0);
 const phase=adventPhase(now),claims=adventClaims(game.adventClaims);
 const [selected,setSelected]=useState(null);
 const dialog=useRef(null),trigger=useRef(null);
 useEffect(()=>{if(selected&&!dialog.current?.open)dialog.current?.showModal();},[selected]);
 function closeDetails(){dialog.current?.close();setSelected(null);trigger.current?.focus();}
 const reward=ADVENT_REWARDS.find(r=>r.id===selected);
 const available=ADVENT_REWARDS.filter(r=>adventDoorState(r,claims,now)==='available').length;
 const [pending,setPending]=useState(null);
 const [message,setMessage]=useState('');
 React.useEffect(()=>{
  if(pending&&claims.includes(pending)){setPending(null);setMessage('Gift collected! Your Pup Account has been updated.');}
 },[pending,claims.join(',')]);
 React.useEffect(()=>{
  if(!pending)return;
  const timeout=setTimeout(()=>{setPending(null);setMessage('Check your cloud sync status before trying again. A gift can only be collected once.');},20000);
  return ()=>clearTimeout(timeout);
 },[pending]);
 const status=reward?adventDoorState(reward,claims,now):null;
 const unlock=reward?adventUnlockTime(reward.day):null;
 const next=phase==='active'?Math.min(ADVENT_END,Date.UTC(2026,11,new Date(now).getUTCDate()+1)):ADVENT_START;
 return <section className="pup-advent" aria-label="Puppy Advent Calendar">
  <header className="pup-advent-hero">
   <span className="pup-advent-kicker">❄ WINTER EVENT · 2026</span>
   <h2>Santa Paws Advent Calendar</h2>
   <p>25 festive gifts. A special Christmas Day jackpot!</p>
   {showTheme&&<button type="button" className="pup-advent-theme" aria-pressed={game.seasonalTheme==='winter'} onClick={()=>act({type:"setPreference",name:"seasonalTheme",value:game.seasonalTheme==='winter'?'default':'winter'})}>{game.seasonalTheme==='winter'?'Disable winter theme':'❄ Enable winter theme'}</button>}
   <span className="pup-advent-clock">{phase==='upcoming'?'Opens in '+countdown(ADVENT_START-now):phase==='active'?'Next reset in '+countdown(next-now):'Event ended'}</span>
  </header>
  <div className="pup-advent-summary">
   <strong>{claims.length} / 25 collected</strong><span>{available} ready</span>
   <progress value={claims.length} max={25} aria-label="Advent gift collection progress"/>
  </div>
  <p className="pup-advent-note">December 1–25 · UTC. Missed days remain available until the event ends. One gift per day per Pup Account.</p>
  {readOnly&&<p className="pup-advent-note">{guest?"Sign in to collect your gifts when the event opens.":"Connect your Pup Account cloud save to collect gifts."}</p>}
  <div className="pup-advent-grid">
   {ADVENT_REWARDS.map(r=>{
    const state=adventDoorState(r,claims,now);
    return <button key={r.id} type="button" className={'pup-advent-door'+(r.bonus?' finale':isMilestone(r)?' milestone':'')} data-state={state}
     aria-label={'December '+r.day+', '+state} aria-haspopup="dialog" onClick={e=>{trigger.current=e.currentTarget;setSelected(r.id);setMessage('');}}>
     <span className="pup-advent-door-art"><span className="pup-advent-door-pill">Day {r.day}</span><GiftArt reward={r} opened={state==='claimed'}/></span>
     <span className="pup-advent-door-body"><strong>{r.bonus?'Christmas Gift':isMilestone(r)?'Bonus Gift':'Holiday Gift'}</strong>
     <span className="pup-advent-door-tag"><span aria-hidden="true">{stateIcons[state]}</span> {stateLabels[state]}</span></span>
    </button>;
   })}
  </div>
  {reward&&<dialog ref={dialog} className="pup-advent-dialog" aria-label={'December '+reward.day+' gift'} onCancel={e=>{e.preventDefault();closeDetails();}} onClick={e=>{if(e.target===dialog.current)closeDetails();}}>
   <div className={'pup-advent-detail'+(reward.bonus?' finale':'')}>
    <div className="pup-advent-detail-header"><span className="pup-advent-door-tag">December {reward.day}</span><button type="button" className="pup-advent-close" onClick={closeDetails} aria-label="Close gift details">×</button></div>
    <div className="pup-advent-detail-art"><GiftArt reward={reward} opened={status==='claimed'}/></div>
    <div className="pup-advent-detail-copy"><strong>{reward.bonus?'Christmas Jackpot':isMilestone(reward)?'Bonus Gift':'Holiday Gift'}</strong>
    <p>{status==='locked'?'This gift opens on December '+reward.day+' (UTC).':status==='expired'?'The claim period has ended.':status==='claimed'?'This gift is in your collection.':'Your festive gift is ready!'}</p>
    {unlock&&<dl className="pup-advent-unlock-times"><div><dt>Unlock time (UTC)</dt><dd><time dateTime={new Date(unlock.timestamp).toISOString()}>{unlock.utc}</time></dd></div><div><dt>Your local time</dt><dd><time dateTime={new Date(unlock.timestamp).toISOString()}>{unlock.local}</time></dd></div></dl>}
    {(status!=='locked'||reward.bonus)&&<div className="pup-advent-reward-row"><span>🍪 {money(reward.treats)} Treats</span><span>🦴 {reward.bones} Bones</span><span>🪙 {reward.coins} Pup Coins</span></div>}</div>
    <button type="button" className="pup-advent-claim" disabled={readOnly||status!=='available'||pending!==null}
     onClick={()=>{setPending(reward.id);setMessage('Collecting gift…');act({type:'claimAdvent',id:reward.id});}}>
     {status==='claimed'?'✓ Collected':status==='locked'?'Locked':status==='expired'?'Expired':readOnly?(guest?'Sign in to collect':'Cloud sync required'):pending===reward.id?'Collecting…':'Open Gift'}
    </button>
    <p className="pup-advent-note" role="status" aria-live="polite">{message}</p>
   </div>
  </dialog>}
  <p className="pup-advent-note" role="status" aria-live="polite">{message}</p>
 </section>;
}
