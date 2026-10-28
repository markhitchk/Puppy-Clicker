import React,{useEffect,useRef} from 'react';
import {level} from '../src/engine/game.js';
import {MAX_PLAYER_LEVEL,MAX_PLAYER_XP,levelXp,nextXpTarget} from '../src/engine/balancedProgression.js';

export function GameProgressHeader({game:g,children}){
 const current=level(g),progress=current>=MAX_PLAYER_LEVEL?100:Math.max(0,Math.min(100,100*(g.xp-levelXp(current))/Math.max(1,nextXpTarget(g.xp)-levelXp(current))));
 return <div className="game-progress-header">
  <section className="cyber-panel level-panel"><span aria-hidden="true">⭐</span><div className="min-w-0 flex-1"><strong>Player Level {current} / {MAX_PLAYER_LEVEL}</strong><p>{current>=MAX_PLAYER_LEVEL?'MAX LEVEL · XP '+MAX_PLAYER_XP.toLocaleString():g.xp.toLocaleString()+' / '+nextXpTarget(g.xp).toLocaleString()+' XP'}</p><div className="cyber-progress" role="progressbar" aria-label="Player level progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}><span style={{width:progress+'%'}}/></div></div></section>
  <section className="cyber-panel streak-panel"><span aria-hidden="true">🔥</span><div className="streak-copy"><strong>{g.dailyStreak} day streak</strong><p>Yearly gift bonus · up to 365 days</p><div className="streak-dots" aria-label={g.dailyStreak+' day streak'}>{Array.from({length:7},(_,i)=><span key={i} className={i<g.dailyStreak?'filled':''}>{i<g.dailyStreak?'✓':''}</span>)}</div></div>{children}</section>
 </div>;
}

export function RenamePuppyDialog({name,onSave,onClose}){
 const dialog=useRef(null),input=useRef(null);
 useEffect(()=>{const node=dialog.current;node.showModal();input.current?.select();return()=>node.close();},[]);
 return <dialog ref={dialog} className="casino-intro rename-puppy-dialog cyber-panel" aria-labelledby="rename-puppy-title" onCancel={event=>{event.preventDefault();onClose();}}><h2 id="rename-puppy-title">Rename puppy</h2><p>Choose a nickname for your current puppy.</p><form onSubmit={event=>{event.preventDefault();const name=input.current.value.trim();if(!name)return;onSave(name);}}><label className="web-field">Puppy name<input ref={input} name="puppyName" aria-label="Puppy name" defaultValue={name} maxLength={18} required autoFocus/></label><div className="casino-dialog-actions"><button type="button" className="cyber-button secondary" onClick={onClose}>Cancel</button><button type="submit" className="cyber-button primary">Save name</button></div></form></dialog>;
}

export function PuppyPlatform({children,name,onPrevious,onNext}){
 return <div className="puppy-platform">
  <div className="platform-paws" aria-hidden="true"><span>🐾</span><span>🐾</span><span>🐾</span><span>🐾</span></div>
  <div className="platform-orbit" aria-hidden="true"/>
  <button className="platform-arrow previous" aria-label="Previous unlocked puppy" onClick={onPrevious}>‹</button>
  <div className="platform-portrait">{children}</div>
  <button className="platform-arrow next" aria-label="Next unlocked puppy" onClick={onNext}>›</button>
  <div className="platform-name"><h2 title={name}>{name}</h2><span className="current-puppy-badge">Current Puppy</span></div>
 </div>;
}

export function CasinoIntroDialog({onBack,onContinue}){
 const dialog=useRef(null);
 useEffect(()=>{const node=dialog.current;node.showModal();return ()=>node.close();},[]);
 return <dialog ref={dialog} className="casino-intro cyber-panel" aria-labelledby="casino-intro-title" aria-describedby="casino-intro-description" onCancel={event=>{event.preventDefault();onBack();}}>
  <div className="casino-dialog-icon" aria-hidden="true">🎰</div>
  <span className="eyebrow">PUPPY CLICKER</span>
  <h2 id="casino-intro-title">Puppy Casino</h2>
  <span className="casino-notice">Simulated Gambling</span>
  <p id="casino-intro-description">Slots, roulette, blackjack, Plinko, scratchers and the Lucky Pup Wheel use game-only chips. No real money is used and no prizes have real-world cash value.</p>
  <div className="casino-dialog-actions"><button autoFocus className="cyber-button secondary" onClick={onBack}>Go Back</button><button className="cyber-button primary" onClick={onContinue}>Continue <span aria-hidden="true">→</span></button></div>
 </dialog>;
}
