import React, {useCallback,useEffect,useRef,useState} from 'react';
import {client} from './supabase.js';
import {SOURCE,logo,ROSTER,UPGRADES,RARITIES,freshGame,sanitizeGame,format,level,wellness,mood,careTapBonus,cost,boneCost,ticketCost,withGain,tap,purchase,care,switchPuppy,convertTreatsToChips,casinoSpend,casinoPayout,claimDailyReward,startPark,claimPark,ticketShopCost,buyUpgradeTicket,accessoryPrices,buyAccessory,drawCard,handValue} from './game.js';
import './styles.css';

const NAV=[['play','🐾','Play'],['care','💖','Care'],['puppies','🐶','Roster'],['shop','🛍️','Shop'],['rewards','🎁','Rewards']];
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
  const [wager,setWager]=useState(50);
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
    const r=Math.random(),multi=r<.40?0:r<.64?.5:r<.84?1:r<.96?2:5;
    const payout=Math.floor(wager*multi);
    return {payout,description:payout?'🎟️ Scratcher: +'+format(payout)+' Chips':'🎟️ No prize'};
  });
  const spin=()=>gamble(5,()=>{
    const syms=['🐾','🦴','🐶','🎟️','⭐'];
    const symbols=[0,0,0].map(()=>syms[Math.floor(Math.random()*syms.length)]);
    setReels(symbols);
    const same=symbols[0]===symbols[1]&&symbols[1]===symbols[2];
    const pair=symbols[0]===symbols[1]||symbols[1]===symbols[2]||symbols[0]===symbols[2];
    const payout=same?5*(symbols[0]==='⭐'?12:6):pair?10:0;
    return {payout,description:payout?'🎰 Slots: +'+payout+' Chips':'🎰 No win'};
  });
  const roulette=color=>gamble(5,()=>{
    const number=Math.floor(Math.random()*37),landed=number===0?'green':number%2===0?'black':'red';
    const payout=landed===color?5*(landed==='green'?14:2):0;
    return {payout,description:'🎡 '+number+' · '+landed.toUpperCase()+' · '+(payout?'+'+payout+' Chips':'no win')};
  });
  const startBlackjack=()=>{
    if(gameRef.current.casinoChips<10){notify('Need 10 Casino Chips for Blackjack');return;}
    if(!mutate(g=>casinoSpend(g,10)))return;
    setBlackjack({player:[drawCard(),drawCard()],dealer:[drawCard(),drawCard()],phase:'playing',result:''});
    setCasinoText('');
  };
  const blackjackHit=()=>{
    if(!blackjack||blackjack.phase!=='playing')return;
    const player=[...blackjack.player,drawCard()];
    setBlackjack({...blackjack,player,phase:handValue(player)>21?'done':'playing',result:handValue(player)>21?'Bust · lost 10 Chips':''});
  };
  const blackjackStand=()=>{
    if(!blackjack||blackjack.phase!=='playing')return;
    const dealer=[...blackjack.dealer];while(handValue(dealer)<17)dealer.push(drawCard());
    const p=handValue(blackjack.player),d=handValue(dealer);
    const payout=p>21?0:d>21||p>d?(p===21&&blackjack.player.length===2?25:20):p===d?10:0;
    mutate(g=>casinoPayout(g,payout));
    setBlackjack({...blackjack,dealer,phase:'done',result:payout>10?'You win · +'+payout+' Chips':payout===10?'Push · 10 Chips returned':'Dealer wins'});
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
      {!user&&<div className="banner"><strong>Guest preview</strong> — you can play, but progress will not be saved. <button onClick={login} disabled={!client}>Connect Discord</button></div>}
      {busy&&<div className="banner">⏳ Checking cloud save…</div>}
      {conflict&&<div className="banner danger"><strong>Save conflict:</strong> another browser changed your save. <button onClick={()=>{if(window.confirm('Discard unsaved web changes and load cloud progress?'))void loadCloud(user);}}>Reload cloud save</button></div>}
      {notice&&<div className="toast" role="status" onClick={()=>setNotice('')}>{notice} <button onClick={()=>setNotice('')}>×</button></div>}
      {tab==='play'&&<>
        <div className="section-header"><div><p className="eyebrow">Welcome to your kennel</p><h1>Give your pup some love 🐾</h1></div><span className="tag">LEVEL {level(game)}</span></div>
        <div className="stats-grid">
          <Stat icon="🦴" label="Treats" value={format(game.treats)}/>
          <Stat icon="👆" label="Per tap" value={format(game.clickPower)}/>
          <Stat icon="⏱️" label="Per second" value={format(game.autoPerSecond)}/>
          <Stat icon="🎟️" label="Tickets" value={format(Object.values(game.ticketInventory).reduce((a,b)=>a+b,0))}/>
        </div>
        <div className="play-grid">
          <section className="stage">
            <div className="stage-top"><div><p className="eyebrow">YOUR BEST FRIEND</p><h2>{game.puppyName}</h2></div><span className="tag mood">{mood(game)}</span></div>
            <button className="puppy-tap" onClick={treat} disabled={busy||conflict} aria-label="Tap puppy to earn Treats"><img src={puppy.image} alt={puppy.name} onError={recoverImage}/></button>
            <button className="primary big-treat" onClick={treat} disabled={busy||conflict}>🦴 GIVE TREAT <span>+{format(game.clickPower)}</span></button>
            <p className="hint">Tap to earn Treats and discover rare Upgrade Tickets.</p>
            <div className="stage-meta"><span>🐾 {format(game.totalTaps)} taps</span><span>🔥 Best combo {format(game.bestCombo)}</span></div>
          </section>
          <div className="side-column">
            <Card title="💗 Puppy Care" aside={<strong>{wellness(game)}%</strong>}>
              <p className="muted">Keep your puppy healthy and happy.</p>
              {['happiness','fullness','energy','cleanliness'].map((k,i)=><div className="meter" key={k}><div><span>{['😊 Happiness','🍖 Fullness','⚡ Energy','🫧 Cleanliness'][i]}</span><strong>{game[k]}%</strong></div><progress value={game[k]} max="100"/></div>)}
              <div className="care-grid">
                {[['feed','🍖','Feed'],['play','🎾','Play'],['wash','🫧','Wash'],['rest','💤','Rest']].map(([k,e,label])=><button key={k} onClick={()=>doCare(k)} disabled={busy||conflict}>{e} {label}</button>)}
              </div>
            </Card>
            <Card title="🏆 Your Progress">
              <div className="fact"><span>Lifetime Treats</span><strong>{format(game.lifetimeTreats)}</strong></div>
              <div className="fact"><span>Upgrades purchased</span><strong>{format(game.totalShopPurchases)}</strong></div>
              <div className="fact"><span>Tickets found</span><strong>{format(game.totalTicketsFound)}</strong></div>
              <button onClick={()=>setTab('shop')} className="outline wide">Visit Upgrade Shop →</button>
            </Card>
          </div>
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
            <button disabled={!unlocked||selected||busy||conflict} onClick={()=>mutate(g=>{g.puppyStyle=p.id;g.puppyName=p.name.split(' / ')[0];})}>{selected?'✓ Selected':unlocked?'Use puppy':'Locked'}</button>
          </article>;
        })}</div>
      </>}
      {tab==='shop'&&<>
        <div className="section-header"><div><p className="eyebrow">PLAY, COLLECT, UPGRADE</p><h1>Puppy Shop</h1></div><span className="tag">🦴 {format(game.treats)} Treats</span></div>
        <div className="ticket-strip">{RARITIES.map(r=><span key={r}>{r[0]}: {format(game.ticketInventory[r])}</span>)}</div>
        <div className="shop-grid">{UPGRADES.map(u=>{
          const price=cost(game,u),tickets=ticketCost(game,u);
          const possible=game.treats>=price&&(!u.rarity||game.ticketInventory[u.rarity]>=tickets);
          return <article className="shop-card" key={u.id}>
            <span className="shop-icon">{u.emoji}</span><div><h3>{u.name}</h3><p>{u.description}</p></div>
            <div className="fact"><span>Owned</span><strong>{game.upgrades[u.id]}</strong></div>
            <button disabled={!possible||busy||conflict} onClick={()=>buy(u)}>Buy · {format(price)} 🦴{u.rarity?' + '+tickets+' '+u.rarity+' 🎟️':''}</button>
          </article>;
        })}</div>
      </>}
      {tab==='casino'&&<>
        <div className="section-header"><div><p className="eyebrow">FUN WITH TREATS</p><h1>Puppy Casino 🎰</h1></div><span className="tag">🦴 {format(game.treats)}</span></div>
        <div className="notice">All minigames use fictional Treats only. No real-money stakes, purchases, prizes, or cash-out.</div>
        {casinoText&&<div className="result" role="status">{casinoText}</div>}
        <div className="casino-grid">
          <Card title="🎟️ Pup Scratchers">
            <p className="muted">Reveal your instant Treat reward.</p>
            <label className="field">Treat wager <select value={wager} onChange={e=>setWager(Number(e.target.value))}>{[25,50,100,250].map(n=><option key={n}>{n}</option>)}</select></label>
            <button className="primary wide" disabled={busy||conflict} onClick={scratch}>Scratch card</button>
          </Card>
          <Card title="🎰 Pup Slots">
            <div className="slot-reels">{reels.map((r,i)=><span key={i}>{r}</span>)}</div>
            <button className="primary wide" disabled={busy||conflict} onClick={spin}>Spin · 25 Treats</button>
          </Card>
          <Card title="🎡 Pup Roulette">
            <p className="muted">Pick your color · 25 Treats per spin.</p>
            <div className="roulette-row">{['red','black','green'].map(c=><button className={'roulette '+c} key={c} disabled={busy||conflict} onClick={()=>roulette(c)}>{c.toUpperCase()}</button>)}</div>
          </Card>
        </div>
        <section className="blackjack panel">
          <div className="panel-heading"><h2>♠️ Puppy Blackjack</h2><span className="tag">50 🦴 / hand</span></div>
          <div className="felt" style={{backgroundImage:'linear-gradient(145deg,rgba(1,33,22,.78),rgba(3,54,27,.75)),url('+SOURCE+'/../App/app/src/main/res/drawable/puppy_blackjack_table.png)'}}>
            <div className="hand"><span>DEALER</span><div className="cards">{blackjack?scoreCards(blackjack.phase==='playing'?blackjack.dealer.slice(0,1):blackjack.dealer).map((c,i)=><i key={i}>{c}</i>):<i>?</i>}{blackjack?.phase==='playing'&&<i className="hidden-card">?</i>}</div><strong>{blackjack?.phase==='done'?handValue(blackjack.dealer):'?'}</strong></div>
            <div className="hand"><span>YOUR HAND</span><div className="cards">{blackjack?scoreCards(blackjack.player).map((c,i)=><i key={i}>{c}</i>):<i>?</i>}</div><strong>{blackjack?handValue(blackjack.player):0}</strong></div>
            {blackjack?.result&&<p className="blackjack-result">{blackjack.result}</p>}
          </div>
          <div className="blackjack-actions">
            <button onClick={startBlackjack} disabled={busy||conflict||blackjack?.phase==='playing'} className="primary">{blackjack?.phase==='done'?'New hand':'Deal · 50 Treats'}</button>
            <button onClick={blackjackHit} disabled={busy||conflict||blackjack?.phase!=='playing'}>Hit</button>
            <button onClick={blackjackStand} disabled={busy||conflict||blackjack?.phase!=='playing'}>Stand</button>
          </div>
        </section>
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
