import React,{useState} from 'react';
import {ADVENT_START,ADVENT_END,ADVENT_REWARDS,adventClaims,adventDoorState,adventPhase} from '../../../supabase/functions/_shared/advent-calendar.js';
import './WebAdventCalendar.css';

const money=n=>n.toLocaleString('en-US');
const countdown=ms=>{
 const seconds=Math.max(0,Math.ceil(ms/1000));
 const days=Math.floor(seconds/86400),hours=Math.floor(seconds/3600)%24,minutes=Math.floor(seconds/60)%60;
 return [days&&days+'d',hours+'h',minutes+'m'].filter(Boolean).join(' ');
};
export default function WebAdventCalendar({game,act,clock,readOnly}){
 const now=clock+(Number.isFinite(game.adventClockOffset)?game.adventClockOffset:0);
 const phase=adventPhase(now),claims=adventClaims(game.adventClaims);
 const [selected,setSelected]=useState(null);
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
 const next=phase==='active'?Math.min(ADVENT_END,Date.UTC(2026,11,new Date(now).getUTCDate()+1)):ADVENT_START;
 return <section className="pup-advent" aria-label="Puppy Advent Calendar">
  <header className="pup-advent-hero">
   <span className="pup-advent-kicker">❄ WINTER EVENT · 2026</span>
   <h2>Santa Paws Advent Calendar</h2>
   <p>25 festive gifts. A special Christmas Day jackpot!</p>
   <span className="pup-advent-clock">{phase==='upcoming'?'Opens in '+countdown(ADVENT_START-now):phase==='active'?'Next reset in '+countdown(next-now):'Event ended'}</span>
  </header>
  <div className="pup-advent-summary">
   <strong>{claims.length} / 25 collected</strong><span>{available} ready</span>
   <progress value={claims.length} max={25} aria-label="Advent gift collection progress"/>
  </div>
  <p className="pup-advent-note">December 1–25 · UTC. Missed days remain available until the event ends. One gift per day per Pup Account.</p>
  {readOnly&&<p className="pup-advent-note">Connect your Pup Account and cloud save to collect gifts.</p>}
  <div className="pup-advent-grid">
   {ADVENT_REWARDS.map(r=>{
    const state=adventDoorState(r,claims,now);
    return <button key={r.id} type="button" className={'pup-advent-door'+(r.bonus?' finale':'')} data-state={state}
     aria-label={'December '+r.day+', '+state} aria-pressed={selected===r.id} onClick={()=>{setSelected(r.id);setMessage('');}}>
     <span>{r.day}</span><span aria-hidden="true">{state==='claimed'?'✓':state==='available'?'🎁':state==='expired'?'–':'🔒'}</span>
     {r.bonus&&<small>Christmas</small>}
    </button>;
   })}
  </div>
  {reward&&<div className="pup-advent-detail">
   <div><strong>December {reward.day}{reward.bonus?' · Christmas Jackpot':''}</strong>
   <p>{status==='locked'?'This gift opens on December '+reward.day+'.':status==='expired'?'The claim period has ended.':
    money(reward.treats)+' Treats · '+reward.bones+' Bones · '+reward.coins+' Pup Coins'}</p></div>
   <button type="button" className="pup-advent-claim" disabled={readOnly||status!=='available'||pending!==null}
    onClick={()=>{setPending(reward.id);setMessage('Collecting gift…');act({type:'claimAdvent',id:reward.id});}}>
    {status==='claimed'?'✓ Collected':status==='locked'?'Locked':status==='expired'?'Expired':pending===reward.id?'Collecting…':'Open Gift'}
   </button>
  </div>}
  <p className="pup-advent-note" role="status" aria-live="polite">{message}</p>
 </section>;
}
