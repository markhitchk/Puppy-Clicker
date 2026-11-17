import React,{useState} from 'react';
import {PUPMAS_REWARDS,pupmasPhase,pupmasDayStatus,pupmasVisualsActive} from './pupmasSeason.js';
import './pupmas.css';

const phaseCopy={
  upcoming:'The first present unlocks December 1, 2026.',
  calendar:'The calendar is open for preview. Reward claiming will be enabled after server integration.',
  catchup:'The Advent days have ended. Catch-up claiming requires server integration.',
  ended:'Pupmas 2026 has ended. The calendar is preserved as a preview.'
};
const stateLabel={locked:'Locked',today:'Today',past:'Past day'};
export default function PupmasCalendar(){
  const [now]=useState(()=>new Date());
  const [selected,setSelected]=useState(()=>{
    const current=new Date();
    return current.getFullYear()===2026&&current.getMonth()===11?Math.min(25,current.getDate()):1;
  });
  const phase=pupmasPhase(now);
  const dayState=pupmasDayStatus(selected,now);
  const visuals=pupmasVisualsActive(now);
  return <div className="pupmas-page">
    <header className="pupmas-hero" aria-labelledby="pupmas-title">
      <div className="pupmas-hero-copy">
        <p className="eyebrow">🐾 PUPPY CLICKER · SEASONAL EVENT</p>
        <h1 id="pupmas-title">🎄 Pupmas 2026</h1>
        <p>25 days of puppy surprises, holiday accessories, and a winter-themed yard — presented in the original Puppy Clicker style.</p>
        <div className="pupmas-actions">
          <a className="cyber-button primary" href="#pupmas-advent">🎁 View Advent Calendar</a>
          <a className="cyber-button secondary" href="/play">🐾 Back to Play</a>
        </div>
      </div>
      <div className="pupmas-hero-logo" aria-hidden="true">
        <img src="/assets/logos/puppy_clicker.png" alt=""/>
      </div>
    </header>

    <div className="pupmas-layout">
      <section className="cyber-panel pupmas-calendar-panel" id="pupmas-advent" aria-labelledby="pupmas-calendar-title">
        <div className="pupmas-section-heading">
          <div><p className="eyebrow">DEC 01 — DEC 25, 2026</p><h2 id="pupmas-calendar-title">🎁 Puppy Advent Calendar</h2></div>
          <span className="pupmas-phase">{phase==='calendar'?'Calendar season':phase==='catchup'?'Catch-up period':phase==='upcoming'?'Coming soon':'Event ended'}</span>
        </div>
        <p className="pupmas-detail" role="status">{phaseCopy[phase]}</p>
        <div className="pupmas-day-grid" aria-label="Advent calendar days">
          {PUPMAS_REWARDS.map((reward,index)=>{
            const day=index+1;
            const status=pupmasDayStatus(day,now);
            return <button
              type="button" key={day}
              className={'pupmas-day'+(selected===day?' is-selected':'')+(day===25?' is-finale':'')}
              onClick={()=>setSelected(day)}
              aria-pressed={selected===day}
              aria-label={'Day '+day+', '+stateLabel[status]+'. Preview '+reward}
            >
              <span className="pupmas-day-icon" aria-hidden="true">{status==='locked'?'🔒':day===25?'🌟':'🎁'}</span>
              <span className="pupmas-day-number">Day {day}</span>
            </button>;
          })}
        </div>
        <p className="pupmas-hint">Choose any day to preview its planned reward. No coins, items, or account progress are changed here.</p>
      </section>

      <aside className="pupmas-side" aria-label="Pupmas details">
        <section className="cyber-panel pupmas-reward-card" aria-labelledby="pupmas-reward-title">
          <div className="pupmas-reward-emoji" aria-hidden="true">{selected===25?'🌟':'🎁'}</div>
          <p className="eyebrow">DAY {String(selected).padStart(2,'0')} · REWARD PREVIEW</p>
          <h2 id="pupmas-reward-title">{PUPMAS_REWARDS[selected-1]}</h2>
          <p className="pupmas-detail">Status: {stateLabel[dayState]}. Reward contents are proposed and subject to final balancing.</p>
          <button className="cyber-button primary pupmas-unavailable" type="button" disabled aria-disabled="true">Claiming not enabled yet</button>
          <p className="pupmas-hint">Claims will require verified Pup Account sessions and server-side daily eligibility before launch.</p>
        </section>
        <section className="cyber-panel pupmas-theme-card" aria-labelledby="pupmas-theme-title">
          <h2 id="pupmas-theme-title">❄️ Christmas Theme Pack</h2>
          <p className="pupmas-detail">Keep the original night-yard game and interface. Add seasonal lights, a subtle snowy atmosphere, and unlockable puppy accessories.</p>
          <div className="pupmas-theme-items">
            <span>✨ Winter yard</span><span>🎅 Puppy hats</span><span>🎀 Holiday collars</span><span>🎁 Festive effects</span>
          </div>
          <p className="pupmas-hint">{visuals?'Seasonal appearance window is active.':'Seasonal decorations run November 27, 2026 – January 5, 2027.'}</p>
          <a className="cyber-button secondary" href="/settings#pupmas-theme-settings">⚙ Customize Christmas theme</a>
        </section>
      </aside>
    </div>
  </div>;
}
