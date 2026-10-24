import React, {useCallback,useEffect,useRef,useState} from 'react';
import {client} from './supabase.js';
import {SOURCE,logo,ROSTER,UPGRADES,RARITIES,freshGame,sanitizeGame,format,level,wellness,mood,careTapBonus,cost,boneCost,ticketCost,withGain,tap,purchase,care,switchPuppy,convertTreatsToChips,casinoSpend,casinoPayout,claimDailyReward,startPark,claimPark,ticketShopCost,buyUpgradeTicket,accessoryPrices,buyAccessory,prestigePointsAvailable,prestige,buyPrestigeSkill,skillCost,PRESTIGE_SKILLS,drawCard,handValue} from './game.js';
import {SCRATCHERS,plinkoOutcome,wheelOutcome,slotsOutcome,rouletteOutcome,scratcherOutcome} from './casinoV7.js';
import './styles.css';

const NAV=[['play','🐾','Play'],['care','💖','Care'],['shop','🛍️','Shop'],['prestige','⭐','Prestige'],['settings','⚙️','Settings']];
const recoverImage=e=>{e.currentTarget.onerror=null;e.currentTarget.src=logo;};
const scoreCards=cards=>cards.map(n=>n===1?'A':n>10?['J','Q','K'][n-11]:String(n));
function Stat({label,value,icon}){return <div className="stat"><span>{icon} {label}</span><strong>{value}</strong></div>;}
function Card({title,children,aside}){return <section className="panel"><div className="panel-heading"><h2>{title}</h2>{aside}</div>{children}</section>;}

export default function App(){
  const [tab,setTab]=useState('play');
  const [game,setGame]=useState(freshGame);
  const gameRef=useRef(game);
  const [user,setUser]=useState(null);
  const userRef=useRef(null);
  const [busy,setBusy]=useState(Boolean(client));
  const busyRef=useRef(Boolean(client));
  const [dirty,setDirty]=useState(false);
  const dirtyRef=useRef(false);
  const [revision,setRevision]=useState(0);
  const revRef=useRef(0);
  const [message,setMessage]=useState('Checking account…');
  const [conflict,setConflict]=useState(false);
  const conflictRef=useRef(false);
  const saveInFlight=useRef(false);
  const editCount=useRef(0);
  const loggedInId=useRef('not-initialized');
  const [notice,setNotice]=useState('');
  const [wager,setWager]=useState(20);
  const [reels,setReels]=useState(['🐾','🦴','🐶']);
  const [casinoText,setCasinoText]=useState('');
  const [blackjack,setBlackjack]=useState(null);
  const [clock,setClock]=useState(Date.now());
  const [chipConvert,setChipConvert]=useState(100);
  const puppy=ROSTER.find(p=>p.id===game.puppyStyle)||ROSTER[0];
  const notify=useCallback(t=>{setNotice(t);},[]);

  const loadCloud=useCallback(async (currentUser,withOffline=true)=>{
    if(!client||!currentUser)return;
    busyRef.current=true;setBusy(true);setMessage('Loading secure cloud save…');
    let failed=false;
    try{
      const {data,error}=await client.from('puppy_web_saves').select('save_data,revision,updated_at')
        .eq('auth_user_id',currentUser.id).maybeSingle();
      if(error)throw error;
      // Discard outdated responses if the account changed during the request.
      if(userRef.current?.id!==currentUser.id)return;
      const restored=sanitizeGame(data?.save_data?.game);
      // The Android V7 game has no passive generation, online or offline.
      const earned=0;
      gameRef.current=restored;setGame(restored);
      revRef.current=Number(data?.revision||0);setRevision(revRef.current);
      editCount.current=0;dirtyRef.current=earned>0;setDirty(earned>0);
      conflictRef.current=false;setConflict(false);
      setMessage(data?'Cloud save loaded':'New web account · cloud save ready');
    }catch(error){
      failed=true;
      setMessage('Cloud load failed: '+error.message+' · gameplay locked until retry');
      notify('Cloud save could not be loaded');
    }finally{
      if(userRef.current?.id===currentUser.id){busyRef.current=failed;setBusy(failed);}
    }
  },[notify]);

  const handleSession=useCallback(session=>{
    const incoming=session?.user||null;
    if(loggedInId.current===incoming?.id)return;
    loggedInId.current=incoming?.id;userRef.current=incoming;setUser(incoming);
    const reset=freshGame();gameRef.current=reset;setGame(reset);
    dirtyRef.current=false;setDirty(false);revRef.current=0;setRevision(0);
    editCount.current=0;conflictRef.current=false;setConflict(false);
    if(incoming){void loadCloud(incoming);}
    else{busyRef.current=false;setBusy(false);setMessage(client?'Guest demo · progress not saved':'Guest demo · Supabase connection not configured');}
  },[loadCloud]);

  useEffect(()=>{
    if(!client){handleSession(null);return;}
    let active=true;
    // Supabase handles PKCE callback exchange in the browser, including the OAuth redirect.
    const {data:{subscription}}=client.auth.onAuthStateChange((_event,session)=>{
      if(active)handleSession(session);
    });
    client.auth.getSession().then(({data,error})=>{
      if(!active)return;
      if(error){setMessage('Account error: '+error.message);busyRef.current=false;setBusy(false);}
      else handleSession(data.session);
    });
    return ()=>{active=false;subscription.unsubscribe();};
  },[handleSession]);

  const mutate=useCallback(fn=>{
    if(busyRef.current||conflictRef.current){notify('Resolve cloud loading or conflict before playing.');return false;}
    const next=structuredClone(gameRef.current);
    const result=fn(next);
    if(result===false)return false;
    next.lastActiveAt=Date.now();
    gameRef.current=next;setGame(next);editCount.current++;
    if(userRef.current){dirtyRef.current=true;setDirty(true);}
    return true;
  },[notify]);

  const save=useCallback(async()=>{
    if(!client||!userRef.current||!dirtyRef.current||saveInFlight.current||conflictRef.current||busyRef.current)return;
    const expected=revRef.current,version=editCount.current,account=userRef.current.id;
    const snapshot=structuredClone(gameRef.current);
    saveInFlight.current=true;setMessage('Saving web progress…');
    try{
      const {data,error}=await client.rpc('puppy_web_save_commit',{
        p_expected_revision:expected,p_save_data:{format:'puppy-clicker-web-save',schemaVersion:1,game:snapshot}
      });
      if(error)throw error;
      if(userRef.current?.id!==account)return;
      revRef.current=Number(data);setRevision(revRef.current);
      if(editCount.current===version){dirtyRef.current=false;setDirty(false);}
      setMessage('Cloud synced · revision '+data);
    }catch(error){
      if(userRef.current?.id!==account)return;
      if(String(error.message).includes('WEB_SAVE_CONFLICT')){
        conflictRef.current=true;setConflict(true);
        setMessage('Cloud changed on another browser. Reload cloud to resolve.');
      }else setMessage('Save failed, will retry: '+error.message);
    }finally{saveInFlight.current=false;}
  },[]);

  useEffect(()=>{const id=setInterval(()=>setClock(Date.now()),1000);return ()=>clearInterval(id);},[]);

  useEffect(()=>{
    const id=setInterval(()=>{void save();},8000);
    const onVisibility=()=>{if(document.visibilityState==='hidden')void save();};
    document.addEventListener('visibilitychange',onVisibility);
    return ()=>{clearInterval(id);document.removeEventListener('visibilitychange',onVisibility);};
  },[save]);

  const login=async()=>{
    if(!client){notify('Supabase connection not configured');return;}
    const {error}=await client.auth.signInWithOAuth({provider:'discord',options:{redirectTo:window.location.origin+window.location.pathname}});
    if(error)notify('Discord sign-in unavailable: '+error.message);
  };
  const logout=async()=>{if(client){await save();await client.auth.signOut();}};
  const treat=()=>{if(gameRef.current.energy<=10){notify('Your puppy is tired. Rest in Care.');return;}let found=null;const ok=mutate(g=>{found=tap(g);});if(ok&&found)notify('🎟️ '+found+' Upgrade Ticket found!');};
  const doCare=kind=>{if(mutate(g=>care(g,kind)))notify('Puppy care complete');else notify('This care action is not available yet');};
  const buy=u=>{if(!mutate(g=>purchase(g,u)))notify('Need more Treats, Bones or matching Tickets');else notify(u.name+' upgraded!');};

  const gamble=(bet,roll)=>{
    if(busyRef.current||conflictRef.current)return;
    if(gameRef.current.casinoChips<bet){notify('Not enough Casino Chips · convert Treats first');return;}
    const result=roll();
    mutate(g=>{if(!casinoSpend(g,bet))return false;casinoPayout(g,result.payout);});
    setCasinoText(result.description);
    return result;
  };
  const scratch=()=>gamble(wager,()=>{
    const out=scratcherOutcome(wager,Math.floor(Math.random()*100));
    return {payout:out.payout,description:out.symbols.join(' ')+' · '+out.prize+' · '+(out.payout?'+'+format(out.payout)+' Chips':'No win')};
  });
  const spin=()=>gamble(20,()=>{
    const out=slotsOutcome(20,[0,0,0].map(()=>Math.floor(Math.random()*100)));
    setReels(out.symbols);
    return {payout:out.payout,description:out.winKind+' · '+(out.payout?'+'+format(out.payout)+' Chips':'No win')};
  });
  const roulette=color=>gamble(20,()=>{
    const out=rouletteOutcome(20,color.toUpperCase(),Math.floor(Math.random()*37));
    return {payout:out.payout,description:'🎡 '+out.number+' · '+out.color+' · '+(out.payout?'+'+out.payout+' Chips':'No win')};
  });
  const plinko=()=>gamble(20,()=>{
    const out=plinkoOutcome(20,Array.from({length:8},()=>Math.random()<0.5));
    return {payout:out.payout,description:'🔵 Plinko · pocket '+(out.binIndex+1)+'/9 · '+out.multiplierHundredths/100+'× · +'+out.payout+' Chips'};
  });
  const wheel=()=>gamble(20,()=>{
    // Android unlock rewards require an authenticated reward ledger; disabled here.
    const out=wheelOutcome(20,Math.floor(Math.random()*100),false);
    return {payout:out.payout,description:out.emoji+' Lucky Wheel · '+out.prize+' · +'+out.payout+' Chips'};
  });
  const startBlackjack=()=>{
    if(gameRef.current.casinoChips<20){notify('Need 20 Casino Chips for Blackjack');return;}
    if(!mutate(g=>casinoSpend(g,20)))return;
    setBlackjack({player:[drawCard(),drawCard()],dealer:[drawCard(),drawCard()],phase:'playing',result:''});
    setCasinoText('');
  };
  const blackjackHit=()=>{
    if(!blackjack||blackjack.phase!=='playing')return;
    const player=[...blackjack.player,drawCard()];
    setBlackjack({...blackjack,player,phase:handValue(player)>21?'done':'playing',result:handValue(player)>21?'Bust · lost 20 Chips':''});
  };
  const blackjackStand=()=>{
    if(!blackjack||blackjack.phase!=='playing')return;
    const dealer=[...blackjack.dealer];while(handValue(dealer)<17)dealer.push(drawCard());
    const p=handValue(blackjack.player),d=handValue(dealer);
    const payout=p>21?0:d>21||p>d?(p===21&&blackjack.player.length===2?50:40):p===d?20:0;
    mutate(g=>casinoPayout(g,payout));
    setBlackjack({...blackjack,dealer,phase:'done',result:payout>20?'You win · +'+payout+' Chips':payout===20?'Push · 20 Chips returned':'Dealer wins'});
  };
  const dayOfToday=()=>{const n=new Date();return Math.floor(Date.UTC(n.getFullYear(),n.getMonth(),n.getDate())/86400000);};
  const showDaily=()=>{if(mutate(g=>claimDailyReward(g,dayOfToday())))notify('Daily reward claimed!');else notify('Daily reward already claimed today');};
  const showPark=()=>{
    const go=gameRef.current.parkActive?mutate(g=>claimPark(g,Date.now())):mutate(g=>startPark(g,Date.now()));
    if(go)notify(gameRef.current.parkActive?'Puppy is exploring the park':'Park reward claimed!');
  };
  const convert=()=>{if(mutate(g=>convertTreatsToChips(g,chipConvert)))notify('Converted to '+chipConvert/10+' Casino Chips');else notify('Conversion requires enough Treats in exact multiples of 10');};

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><img src={logo} alt="Puppy Clicker" onError={recoverImage}/><div><strong>PUPPY CLICKER</strong><small>WEB EDITION · HARLEY'S STUDIOS</small></div></div>
      <button className={'sync-pill '+(conflict?'bad':dirty?'pending':'')} onClick={()=>{setTab('settings');if(user)void save();}} type="button">
        <span className="sync-dot"/> {user?conflict?'CONFLICT':dirty?'SAVE PENDING':'CLOUD SAVE':'GUEST DEMO'}
      </button>
    </header>
    <main>
      <div className="utility-tabs" aria-label="Additional game screens">
        <button onClick={()=>setTab('puppies')} className={tab==='puppies'?'selected':''}>🐶 Roster</button>
        <button onClick={()=>setTab('rewards')} className={tab==='rewards'?'selected':''}>🎁 Rewards</button>
        <button onClick={()=>setTab('casino')} className={tab==='casino'?'selected':''}>🎰 Casino</button>
      </div>
      {!user&&<div className="banner"><strong>Guest preview</strong> — you can play, but progress will not be saved. <button onClick={login} disabled={!client}>Connect Discord</button></div>}
      {busy&&<div className="banner">⏳ Checking cloud save…</div>}
      {conflict&&<div className="banner danger"><strong>Save conflict:</strong> another browser changed your save. <button onClick={()=>{if(window.confirm('Discard unsaved web changes and load cloud progress?'))void loadCloud(user);}}>Reload cloud save</button></div>}
      {notice&&<div className="toast" role="status" onClick={()=>setNotice('')}>{notice} <button onClick={()=>setNotice('')}>×</button></div>}
      {tab==='play'&&<>
        <div className="section-header"><div><p className="eyebrow">PUPPY CLICKER V7 · PLAY</p><h1>Tap your puppy and earn Treats!</h1></div><span className="tag">LEVEL {level(game)}</span></div>
        <div className="stats-grid wallet">
          <Stat icon="🍪" label="Treats" value={format(game.treats)}/>
          <Stat icon="🦴" label="Bones" value={format(game.bones)}/>
          <Stat icon="🪙" label="Pup Coins" value={format(game.pupCoins)}/>
          <Stat icon="🐾" label="Casino Chips" value={format(game.casinoChips)}/>
        </div>
        <div className="play-grid">
          <section className="stage">
            <div className="stage-top"><div><p className="eyebrow">CURRENT PUPPY</p><h2>{game.puppyName}</h2></div><span className="tag mood">{mood(game)}</span></div>
            <button className="puppy-tap" onClick={treat} disabled={busy||conflict||game.energy<=10} aria-label="Tap puppy to earn Treats"><img src={puppy.image} alt={puppy.name} onError={recoverImage}/></button>
            <p className="hint">⚡ Energy {game.energy}% · Care bonus +{careTapBonus(game)} 🍪/tap</p>
            <button className="primary big-treat" onClick={treat} disabled={busy||conflict||game.energy<=10}>{game.energy<=10?'😴 Puppy is tired · Rest in Care':'🐾 TAP '+game.puppyName.toUpperCase()} <span>+{format(game.clickPower+careTapBonus(game))}</span></button>
            <p className="hint">Active upgrade bonus +{format(game.activeBonus)} 🍪 every 10 accepted taps. No passive Treat production.</p>
            <div className="stage-meta"><span>🐾 {format(game.totalTaps)} taps</span><span>🔥 Best combo {format(game.bestCombo)}</span></div>
          </section>
          <div className="side-column">
            <Card title="🏆 Current Progress" aside={<span className="tag">LEVEL {level(game)}</span>}>
              <div className="fact"><span>🍪 Treats per tap</span><strong>{format(game.clickPower+careTapBonus(game))}</strong></div>
              <div className="fact"><span>⚡ 10-tap bonus</span><strong>{format(game.activeBonus)}</strong></div>
              <div className="fact"><span>🦴 Next Bone</span><strong>{20-game.legitimateTaps%20} taps</strong></div>
              <div className="fact"><span>🪙 Next Pup Coin</span><strong>{250-game.legitimateTaps%250} taps</strong></div>
              <div className="fact"><span>🎟️ Tickets found</span><strong>{format(game.totalTicketsFound)}</strong></div>
              <button className="outline wide" onClick={()=>setTab('shop')}>🛍️ Open Shop</button>
            </Card>
            <Card title="💖 Active Puppy Care" aside={<strong>{wellness(game)}%</strong>}>
              <div className="meter"><div><span>⚡ Energy</span><strong>{game.energy}%</strong></div><progress value={game.energy} max="100"/></div>
              <div className="meter"><div><span>💗 Wellness</span><strong>{wellness(game)}%</strong></div><progress value={wellness(game)} max="100"/></div>
              <button className="outline wide" onClick={()=>setTab('care')}>Care for {game.puppyName} →</button>
              <button className="outline wide" onClick={()=>setTab('puppies')}>Change Puppy →</button>
            </Card>
          </div>
        </div>
      </>}
      {tab==='care'&&<>
        <div className="section-header"><div><p className="eyebrow">PUPPY CARE · PER-PUPPY PROGRESS</p><h1>Care for {game.puppyName} 💖</h1></div><span className="tag">{wellness(game)}% WELLNESS</span></div>
        <div className="care-layout">
          <Card title="💖 Daily care" aside={<span className="tag">{mood(game)}</span>}>
            {['happiness','fullness','energy','cleanliness','bond'].map((k,i)=><div className="meter" key={k}><div><span>{['😊 Happiness','🍖 Fullness','⚡ Energy','🫧 Cleanliness','💞 Bond'][i]}</span><strong>{game[k]}%</strong></div><progress value={game[k]} max="100"/></div>)}
            <div className="care-grid">
              {[['feed','🍖 Feed · 20 Treats'],['play','🎾 Play · 1 Bone'],['rest','💤 Rest · Free'],['wash','🫧 Groom · 10 Treats'],['cuddle','💞 Cuddle · Free']].map(([kind,label])=><button key={kind} onClick={()=>doCare(kind)} disabled={busy||conflict}>{label}</button>)}
            </div>
          </Card>
          <Card title="🌳 Park Adventure">
            <p className="muted">Send your puppy to the park for 60 seconds, then claim a Treat reward.</p>
            <div className="fact"><span>State</span><strong>{!game.parkActive?'Ready':clock<game.parkReadyAtMs?'Exploring':'Reward ready'}</strong></div>
            <button className="primary wide" disabled={busy||conflict||(game.parkActive&&clock<game.parkReadyAtMs)} onClick={showPark}>
              {game.parkActive?'Claim park reward':'Start adventure · 20 energy'}
            </button>
          </Card>
        </div>
      </>}
      {tab==='puppies'&&<>
        <div className="section-header"><div><p className="eyebrow">V1 & V2 ORIGINAL ARTWORK</p><h1>Your Puppy Collection</h1></div><span className="tag">{game.unlockedPuppies.length} / {ROSTER.length} Unlocked</span></div>
        <div className="notice">Rare, seasonal, V2, and developer puppies remain locked until awarded by the game's supported reward systems.</div>
        <div className="roster-grid">{ROSTER.map(p=>{
          const unlocked=game.unlockedPuppies.includes(p.id),selected=game.puppyStyle===p.id;
          return <article className={'roster-card '+(!unlocked?'locked ':'')+(selected?'selected':'')} key={p.id}>
            <img src={p.image} loading="lazy" alt={p.name} onError={recoverImage}/>
            <h3>#{p.number} {p.name}</h3><p>{unlocked?'Unlocked':'🔒 Locked reward'}</p>
            <button disabled={!unlocked||selected||busy||conflict} onClick={()=>mutate(g=>switchPuppy(g,p.id))}>{selected?'✓ Selected':unlocked?'Use puppy':'Locked'}</button>
          </article>;
        })}</div>
      </>}
      {tab==='shop'&&<>
        <div className="section-header"><div><p className="eyebrow">UPGRADES · V7 ECONOMY</p><h1>Puppy Shop 🛍️</h1></div><span className="tag">🍪 {format(game.treats)} · 🦴 {format(game.bones)}</span></div>
        <div className="ticket-strip">{RARITIES.map(r=><span key={r}>{r}: {format(game.ticketInventory[r])}</span>)}</div>
        <div className="shop-grid">{UPGRADES.map(u=>{
          const price=cost(game,u),bones=boneCost(u),tickets=ticketCost(game,u);
          const possible=game.treats>=price&&game.bones>=bones&&(!u.rarity||game.ticketInventory[u.rarity]>=tickets);
          return <article className="shop-card" key={u.id}>
            <span className="shop-icon">{u.emoji}</span><div><h3>{u.name}</h3><p>{u.description}</p></div>
            <div className="fact"><span>Owned</span><strong>{game.upgrades[u.id]}</strong></div>
            <button disabled={!possible||busy||conflict} onClick={()=>buy(u)}>Buy · {format(price)} 🍪 + {bones} 🦴{u.rarity?' + '+tickets+' '+u.rarity+' 🎟️':''}</button>
          </article>;
        })}</div>
        <div className="care-layout shop-secondary">
          <Card title="🎟️ Upgrade Tickets (Pup Coins)">
            {RARITIES.map(r=><div className="fact" key={r}><span>{r}</span><button disabled={busy||conflict||game.pupCoins<ticketShopCost(r,game.ticketShopPurchases[r])} onClick={()=>{if(mutate(g=>buyUpgradeTicket(g,r)))notify(r+' ticket purchased');}}>🪙 {format(ticketShopCost(r,game.ticketShopPurchases[r]))}</button></div>)}
          </Card>
          <Card title="🎀 Puppy Accessories (Pup Coins)">
            {Object.entries(accessoryPrices).map(([name,price])=><div className="fact" key={name}><span>{name}</span>{game.ownedAccessories.includes(name)?<button onClick={()=>mutate(g=>{g.accessory=name;})} disabled={busy||conflict}>{game.accessory===name?'Equipped':'Equip'}</button>:<button onClick={()=>{if(mutate(g=>buyAccessory(g,name)))notify(name+' unlocked');}} disabled={busy||conflict||game.pupCoins<price}>🪙 {price}</button>}</div>)}
          </Card>
        </div>
      </>}
      {tab==='rewards'&&<>
        <div className="section-header"><div><p className="eyebrow">PUPPY REWARDS</p><h1>Daily Rewards & Achievements 🎁</h1></div><span className="tag">STREAK {game.dailyStreak}</span></div>
        <div className="care-layout">
          <Card title="🎁 Daily Login Reward">
            <p className="muted">Claim once per day. Earn Treats, 2 Bones and 3 Pup Coins. Your streak boosts Treat rewards.</p>
            <button className="primary wide" onClick={showDaily} disabled={busy||conflict||game.lastDailyClaimDay===dayOfToday()}>{game.lastDailyClaimDay===dayOfToday()?'✓ Claimed today':'Claim daily reward'}</button>
          </Card>
          <Card title="🏆 Achievements · Progress">
            {[
              ['🐾 First Treat',game.lifetimeTreats,1],
              ['🍪 Snack Stash',game.lifetimeTreats,100],
              ['🏆 Puppy Pro',game.lifetimeTreats,1000],
              ['🔥 Combo Hero',game.bestCombo,20],
              ['🎟️ Ticket Hunter',game.totalTicketsFound,1],
              ['💪 Big Taps',game.clickPower,25],
              ['🦴 Bone Collector',game.bones,50],
              ['💜 Best Friend',level(game),10]
            ].map(([label,value,target])=><div className="fact" key={label}><span>{label}</span><strong>{value>=target?'✓':format(value)+' / '+target}</strong></div>)}
            <p className="smallprint">Achievement XP claims are not enabled until the native reward ledger is ported.</p>
          </Card>
        </div>
      </>}
      {tab==='casino'&&<>
        <div className="section-header"><div><p className="eyebrow">PUPPY CASINO · SIX GAMES</p><h1>Puppy Casino 🎰</h1></div><span className="tag">🐾 {format(game.casinoChips)} Chips</span></div>
        <div className="notice">Casino wagers use fictional Casino Chips only. Treats convert at 10 🍪 = 1 🐾 Chip. No real-money purchases, cash-out or prizes.</div>
        <Card title="🐾 Casino Chip Exchange">
          <p className="muted">Convert Treats to Casino Chips. The Android game does not allow reverse conversion.</p>
          <div className="button-row"><select className="convert-select" value={chipConvert} onChange={e=>setChipConvert(Number(e.target.value))}>{[100,200,500,1000,2500,5000,10000].map(n=><option value={n} key={n}>{n} Treats → {n/10} Chips</option>)}</select><button className="primary" disabled={busy||conflict||game.treats<chipConvert} onClick={convert}>Convert Treats</button></div>
        </Card>
        {casinoText&&<div className="result" role="status">{casinoText}</div>}
        <div className="casino-grid">
          <Card title="🎟️ Pup Scratchers">
            <p className="muted">Choose one of the six source-game scratch cards.</p>
            <label className="field">Card type / Chip wager
              <select value={wager} onChange={e=>setWager(Number(e.target.value))}>
                {SCRATCHERS.map(card=><option value={card.wager} key={card.id}>{card.emoji} {card.name} · {format(card.wager)} Chips</option>)}
              </select>
            </label>
            <button className="primary wide" disabled={busy||conflict||game.casinoChips<wager} onClick={scratch}>Scratch card</button>
          </Card>
          <Card title="🎰 Puppy Slots">
            <img className="casino-asset" src="https://raw.githubusercontent.com/markhitchk/pup-clinker/main/App/app/src/main/res/drawable/puppy_slots_machine.png" alt="Original Puppy Slots machine" loading="lazy"/>
            <div className="slot-reels">{reels.map((r,i)=><span key={i}>{r}</span>)}</div>
            <button className="primary wide" disabled={busy||conflict||game.casinoChips<20} onClick={spin}>Spin · 20 Chips</button>
          </Card>
          <Card title="🎡 Pup Roulette">
            <p className="muted">European single-zero wheel · color wager · 20 Chips.</p>
            <div className="roulette-row">{['red','black'].map(color=><button className={'roulette '+color} key={color} disabled={busy||conflict||game.casinoChips<20} onClick={()=>roulette(color)}>{color.toUpperCase()}</button>)}</div>
          </Card>
          <Card title="🔵 Pup Plinko">
            <img className="casino-asset" src="https://raw.githubusercontent.com/markhitchk/pup-clinker/main/App/app/src/main/res/drawable/puppy_plinko_frame.png" alt="Original Puppy Plinko frame" loading="lazy"/>
            <p className="muted">8 rows · 9 payout pockets · native 97.3% payout table.</p>
            <button className="primary wide" disabled={busy||conflict||game.casinoChips<20} onClick={plinko}>Drop · 20 Chips</button>
          </Card>
          <Card title="🎡 Lucky Pup Wheel">
            <img className="casino-asset" src="https://raw.githubusercontent.com/markhitchk/pup-clinker/main/App/app/src/main/res/drawable/puppy_lucky_wheel_disc.png" alt="Original Lucky Pup Wheel disc" loading="lazy"/>
            <p className="muted">Original wheel prize weights. Puppy unlocks require a protected reward ledger and refund until implemented.</p>
            <button className="primary wide" disabled={busy||conflict||game.casinoChips<20} onClick={wheel}>Spin · 20 Chips</button>
          </Card>
        </div>
        <section className="blackjack panel">
          <div className="panel-heading"><h2>♠️ Puppy Blackjack</h2><span className="tag">20 🐾 / hand</span></div>
          <div className="felt" style={{backgroundImage:'linear-gradient(145deg,rgba(1,33,22,.68),rgba(3,54,27,.65)),url(https://raw.githubusercontent.com/markhitchk/pup-clinker/main/App/app/src/main/res/drawable/puppy_blackjack_table.png)'}}>
            <div className="hand"><span>DEALER</span><div className="cards">{blackjack?scoreCards(blackjack.phase==='playing'?blackjack.dealer.slice(0,1):blackjack.dealer).map((s,i)=><i key={i}>{s}</i>):<i>?</i>}{blackjack?.phase==='playing'&&<i className="hidden-card">?</i>}</div><strong>{blackjack?.phase==='done'?handValue(blackjack.dealer):'?'}</strong></div>
            <div className="hand"><span>YOUR HAND</span><div className="cards">{blackjack?scoreCards(blackjack.player).map((s,i)=><i key={i}>{s}</i>):<i>?</i>}</div><strong>{blackjack?handValue(blackjack.player):0}</strong></div>
            {blackjack?.result&&<p className="blackjack-result">{blackjack.result}</p>}
          </div>
          <div className="blackjack-actions">
            <button onClick={startBlackjack} disabled={busy||conflict||blackjack?.phase==='playing'||game.casinoChips<20} className="primary">{blackjack?.phase==='done'?'New hand':'Deal · 20 Chips'}</button>
            <button onClick={blackjackHit} disabled={busy||conflict||blackjack?.phase!=='playing'}>Hit</button>
            <button onClick={blackjackStand} disabled={busy||conflict||blackjack?.phase!=='playing'}>Stand</button>
          </div>
          <p className="smallprint">Blackjack split/double and crash-recovery parity remain in progress. Round-start server attestation is not yet implemented.</p>
        </section>
      </>}
      {tab==='prestige'&&<>
        <div className="section-header"><div><p className="eyebrow">PERMANENT PROGRESSION</p><h1>Prestige Center ⭐</h1></div><span className="tag">PRESTIGE {game.prestigeCount}</span></div>
        <div className="care-layout">
          <Card title="⭐ Prestige Center" aside={<strong>{format(game.skillPoints)} SP</strong>}>
            <p className="muted">{prestigePointsAvailable(game)>0?'You can Prestige for +'+prestigePointsAvailable(game)+' Skill Point(s).':format(Math.max(0,50000-game.lifetimeTreats))+' more lifetime Treats needed to unlock Prestige.'}</p>
            <progress value={Math.min(50000,game.lifetimeTreats)} max="50000" className="prestige-progress"/>
            <button className="primary wide" disabled={busy||conflict||prestigePointsAvailable(game)<1} onClick={()=>{
              if(window.confirm('Prestige your current run? Treats, Bones, tickets, upgrades and run progress reset. Puppies, Pup Coins, Casino Chips, accessories and permanent skills stay.')){
                if(mutate(g=>prestige(g)))notify('⭐ Prestige complete!');}
            }}>{prestigePointsAvailable(game)>0?'Prestige for +'+prestigePointsAvailable(game)+' SP':'Prestige locked'}</button>
          </Card>
          <Card title="🌟 Permanent Skill Tree">
            <p className="muted">Skills improve Shop purchases. They do not give free tap power on their own.</p>
            {[
              ['TAP_TRAINING','👆 Tap Training','Extra tap power per CLICK upgrade'],
              ['AUTO_TRAINING','⚡ Active Training','Extra bonus per ACTIVE upgrade'],
              ['SMART_SHOPPER','🛍️ Smart Shopper','5% lower Treat costs per level'],
              ['TICKET_SENSE','🎟️ Ticket Sense','Reduced matching-ticket requirements']
            ].map(([key,title,desc])=><div className="skill-row" key={key}><div><strong>{title}</strong><p className="muted">{desc} · {game.prestigeSkills[key]||0}/5</p></div>
              <button disabled={busy||conflict||game.skillPoints<skillCost(game,key)||(game.prestigeSkills[key]||0)>=5} onClick={()=>{if(mutate(g=>buyPrestigeSkill(g,key)))notify('Skill upgraded');}}>
                {(game.prestigeSkills[key]||0)>=5?'MAX':skillCost(game,key)+' SP'}
              </button></div>)}
          </Card>
        </div>
      </>}
      {tab==='settings'&&<>
        <div className="section-header"><div><p className="eyebrow">PASSWORDLESS ACCOUNT</p><h1>Account & Cloud Save</h1></div><span className="tag">Rev {revision}</span></div>
        <Card title="🔐 Discord Account">
          {user?<><p>Signed in as <strong>{user.user_metadata?.full_name||user.user_metadata?.name||user.email||'Discord Player'}</strong>.</p><p className="muted">Web progress belongs to this authenticated Supabase account.</p><button onClick={logout} className="outline">Sign out</button></>
            :<><p>Sign in with Discord to securely save your web edition progress.</p><button onClick={login} disabled={!client} className="primary">Connect with Discord</button></>}
        </Card>
        <Card title="☁️ Web Cloud Sync" aside={<span className="tag">Revision {revision}</span>}>
          <p className="muted">{message}</p>
          <div className="button-row">
            <button onClick={()=>void save()} disabled={!user||busy||!dirty||conflict}>Save now</button>
            <button onClick={()=>{if(user&&(!dirty||window.confirm('Discard unsaved web changes and load cloud progress?')))void loadCloud(user,false);}} disabled={!user}>Retry / load cloud</button>
          </div>
          <p className="smallprint">Supabase stores this web save under your account. Android PupEye-protected saves are separate until account linking is implemented. No file import/export.</p>
        </Card>
        <Card title="🛡️ Fair Play & Privacy">
          <p className="muted">This web edition does not modify Android game saves, PupEye installation identities, bans, or administrator controls. Web leaderboards and shared Android progression are disabled until server-authoritative validation is available.</p>
        </Card>
      </>}
    </main>
    <nav className="bottom-nav" aria-label="Game navigation">{NAV.map(([id,emoji,label])=><button className={tab===id?'active':''} key={id} onClick={()=>{setTab(id);window.scrollTo({top:0,behavior:'smooth'});}}><span>{emoji}</span><small>{label}</small></button>)}</nav>
    <footer>© Harley's Studios · Puppy Clicker Web · Independent React edition</footer>
  </div>;
}
