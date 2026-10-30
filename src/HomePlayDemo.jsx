import React,{useReducer} from "react";
import {careTapBonus,cost,boneCost,format} from "./game.js";
import {
 createHomePlayDemo,reduceHomePlayDemo,HOME_DEMO_PUPPIES,
 HOME_DEMO_UPGRADE,HOME_DEMO_GOAL,
} from "./homePlayDemoState.js";
import "./HomePlayDemo.css";

// A self-contained playable preview of /play. Do not mount NativeApp or the
// authenticated game here: the demo must never read/write a real player's save.
export default function HomePlayDemo(){
 const [game,dispatch]=useReducer(reduceHomePlayDemo,undefined,createHomePlayDemo);
 const puppy=HOME_DEMO_PUPPIES.find(p=>p.id===game.puppyStyle)||HOME_DEMO_PUPPIES[0];
 const tapGain=game.clickPower+careTapBonus(game);
 const upgradeTreats=cost(game,HOME_DEMO_UPGRADE);
 const upgradeBones=boneCost(HOME_DEMO_UPGRADE);
 const canUpgrade=game.treats>=upgradeTreats&&game.bones>=upgradeBones;
 const progress=Math.min(HOME_DEMO_GOAL,game.totalTaps);
 const resources=[
  ["🍪","Treats",game.treats],
  ["🦴","Bones",game.bones],
  ["🪙","Pup Coins",game.pupCoins],
  ["🐾","Casino Chips",game.casinoChips],
 ];
 const demoTap=()=>dispatch({type:"tap",now:Date.now()});
 return <section className="home-section home-play-demo" id="try-play" aria-labelledby="home-demo-heading" data-testid="home-play-demo">
  <div className="home-play-demo__intro">
   <div><p className="eyebrow">🐾 TRY BEFORE YOU SIGN IN</p>
    <h2 id="home-demo-heading">Try Puppy Clicker right here</h2>
    <p>Tap a puppy, earn sample Treats, explore the roster and try an upgrade. This interactive preview uses the game's tap, care and shop rules.</p>
   </div>
   <span className="home-play-demo__badge">DEMO · NO LOGIN</span>
  </div>
  <div className="home-play-demo__window">
   <div className="home-play-demo__toolbar">
    <div className="home-play-demo__toolbar-title"><span aria-hidden="true">🐾</span><strong>Puppy Clicker</strong><span className="home-play-demo__toolbar-tag">Play preview</span></div>
    <a href="/play" className="home-play-demo__open">Open full game <span aria-hidden="true">↗</span></a>
   </div>
   <div className="home-play-demo__layout">
    <div className="home-play-demo__scene">
     <div className="home-play-demo__scene-heading"><div><h3>Play</h3><p>Tap your puppy and earn Treats.</p></div>
      <span className="home-play-demo__current">Current Puppy</span>
     </div>
     <div className="home-play-demo__portrait-wrap">
      <button type="button" className="home-play-demo__portrait" onClick={demoTap} aria-label={`Tap ${game.puppyName} to earn ${tapGain} demo Treats`}>
       <img src={puppy.image.replace("/assets/","/assets/transparent/")} alt={puppy.name} decoding="async" loading="lazy"/>
      </button>
      <div className="home-play-demo__orbit" aria-hidden="true"/>
     </div>
     <div className="home-play-demo__name">{game.puppyName}<small>{puppy.name} · Sample puppy</small></div>
     <div className="home-play-demo__energy"><span>⚡ Energy <strong>{game.energy}%</strong></span><span>💖 Care bonus <strong>+{careTapBonus(game)} / tap</strong></span></div>
     <button type="button" className="home-play-demo__tap" onClick={demoTap}>
      <span aria-hidden="true">🐾</span> Tap {game.puppyName} <strong>+{format(tapGain)} 🍪</strong>
     </button>
    </div>
    <aside className="home-play-demo__sidebar" aria-label="Sample game information">
     <div className="home-play-demo__panel">
      <h4>Resources</h4>
      <div className="home-play-demo__wallet">{resources.map(([emoji,label,value])=>
       <div className="home-play-demo__wallet-item" key={label}><span aria-hidden="true">{emoji}</span><strong>{format(value)}</strong><small>{label}</small></div>
      )}</div>
     </div>
     <div className="home-play-demo__panel">
      <h4>🎯 Today's goals <small>Sample challenge</small></h4>
      <div className="home-play-demo__goal-label"><strong>Tap your puppy</strong><span>{progress}/{HOME_DEMO_GOAL}</span></div>
      <div className="home-play-demo__progress" role="progressbar" aria-label="Demo tap goal" aria-valuemin={0} aria-valuemax={HOME_DEMO_GOAL} aria-valuenow={progress}><span style={{width:100*progress/HOME_DEMO_GOAL+"%"}}/></div>
      <p>{progress===HOME_DEMO_GOAL?"🎉 Sample goal complete!":"Keep tapping to try a daily-style goal."}</p>
     </div>
     <div className="home-play-demo__panel home-play-demo__shop">
      <h4>🛍️ Upgrade shop</h4>
      <div className="home-play-demo__upgrade"><div><strong>{HOME_DEMO_UPGRADE.emoji} {HOME_DEMO_UPGRADE.name}</strong><small>{HOME_DEMO_UPGRADE.description} · Level {game.upgrades[HOME_DEMO_UPGRADE.id]}</small></div>
      <button type="button" onClick={()=>dispatch({type:"upgrade"})} disabled={!canUpgrade} aria-label={`Buy ${HOME_DEMO_UPGRADE.name} for ${upgradeTreats} Treats and ${upgradeBones} Bones`}>Buy · {format(upgradeTreats)} 🍪 + {upgradeBones} 🦴</button></div>
     </div>
     <div className="home-play-demo__panel home-play-demo__care">
      <h4>💖 Pup Care Status</h4>
      <div className="home-play-demo__care-row"><span>Happiness</span><strong>{game.happiness}%</strong></div>
      <div className="home-play-demo__progress"><span style={{width:game.happiness+"%"}}/></div>
      <div className="home-play-demo__care-row"><span>Energy</span><strong>{game.energy}%</strong></div>
      <div className="home-play-demo__progress"><span style={{width:game.energy+"%"}}/></div>
      <button type="button" disabled={game.energy>=100} onClick={()=>dispatch({type:"rest"})}>🛌 Rest puppy (+30 energy)</button>
     </div>
    </aside>
   </div>
   <div className="home-play-demo__bottom">
    <div className="home-play-demo__roster"><strong>🐶 Switch puppy</strong>
     <div className="home-play-demo__puppies">{HOME_DEMO_PUPPIES.map(p=>
      <button key={p.id} type="button" aria-label={`Play with ${p.name}`} aria-pressed={p.id===game.puppyStyle} className={p.id===game.puppyStyle?"selected":""}
       onClick={()=>dispatch({type:"switch",id:p.id,now:Date.now()})}>
       <img src={p.image.replace("/assets/","/assets/transparent/")} alt="" loading="lazy" decoding="async"/>
       <span>{p.name.split(" / ")[0]}</span>
      </button>
     )}</div>
    </div>
    <button type="button" className="home-play-demo__reset" onClick={()=>dispatch({type:"reset"})}>↺ Reset demo</button>
   </div>
  </div>
  <div className="home-play-demo__footer">
   <p><strong>🔒 Demo only.</strong> All Treats, upgrades and puppy care here are temporary and stay on this page. No Pup Account is needed or changed, and demo progress is never saved.</p>
   <a href="/play" className="cta cta-primary">🐾 Play the full game</a>
  </div>
 </section>;
}
