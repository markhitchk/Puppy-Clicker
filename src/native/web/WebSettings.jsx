import React,{useEffect,useState,useId} from 'react';
import PuppyArtwork from './PuppyArtwork.jsx';
import LanguagePicker from '../../LanguagePicker.jsx';
import {ACCENT_PRESETS} from '../src/engine/settings.js';
import {level} from '../src/engine/game.js';

function Toggle({title,detail,value,onChange}){
 return <label className="web-setting-row"><span><strong>{title}</strong>{detail?<small>{detail}</small>:null}</span><input type="checkbox" role="switch" aria-label={title} checked={value===true} onChange={event=>onChange(event.target.checked)}/></label>;
}
function Choices({label,value,items,onChange}){
 const group=useId();
 return <fieldset className="web-setting-choices"><legend>{label}</legend><div>{items.map(([id,title])=><label className="web-setting-option" key={id}><input type="radio" name={group} aria-label={title} checked={value===id} onChange={()=>onChange(id)}/><span>{title}</span></label>)}</div></fieldset>;
}
export default function WebSettings({g,act,onOpen,registry,notifications,account,syncStatus,gameplayBusy=false,cloudState,onRefreshAccount,onUpdateAccountName,onConnectAccount}){
 const [expanded,setExpanded]=useState(null),[name,setName]=useState(g.guestName),[hex,setHex]=useState(g.accentHex),[custom,setCustom]=useState(false);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[reset,setReset]=useState(false),[refreshing,setRefreshing]=useState(false);
 const [fullscreen,setFullscreen]=useState(Boolean(document.fullscreenElement));
 useEffect(()=>setName(g.guestName),[g.guestName]);
 useEffect(()=>setHex(g.accentHex),[g.accentHex]);
 useEffect(()=>{const change=()=>setFullscreen(Boolean(document.fullscreenElement));document.addEventListener('fullscreenchange',change);return()=>document.removeEventListener('fullscreenchange',change);},[]);
 const accentGroup=useId();
 const pref=(name,value)=>act({type:'setPreference',name,value});
 const section=(id,title,description,children)=><section className="cyber-panel web-setting-section" key={id}><h2><button type="button" aria-label={title} aria-expanded={expanded===id} aria-controls={'web-settings-'+id} onClick={()=>{setExpanded(expanded===id?null:id);setMessage('');}}><span><strong>{title}</strong><small>{description}</small></span><span aria-hidden="true">{expanded===id?'−':'+'}</span></button></h2>{expanded===id?<div className="web-setting-body" id={'web-settings-'+id}>{children}{message?<p className="web-settings-message" role="status">{message}</p>:null}</div>:null}</section>;
 const connected=cloudState==='LIVE_SYNCED'&&!['BLOCKED','RECONNECTING','SAVED_DISPLAY_ERROR'].includes(syncStatus?.state);
 return <div className="web-settings">
  <header><h1>Website Settings</h1><p>Manage your Pup Account and customize this browser.</p><LanguagePicker/></header>
  <section className="cyber-panel web-player-summary"><PuppyArtwork id={g.puppyStyle} name={g.puppyName} size={60}/><div><strong>{g.guestName}</strong><p>Level {level(g)} · {g.xp.toLocaleString()} XP</p><span className="web-status">{connected?'Connected to Pup Account':'Check your cloud connection'}</span></div></section>
  {section('account','Pup Account & cloud save','Your signed-in account and live progress',<>
   <p>Signed in as <strong>{account?.username||g.guestName}</strong>.</p>
   <p role="status">{gameplayBusy?'Saving your progress…':connected?'Cloud progress is connected.':'Cloud progress needs attention. Refresh to check your connection.'}</p>
   <p>Your confirmed gameplay actions are saved to your Pup Account. Browser preferences are stored separately on this device.</p>
   <div className="web-setting-actions"><a className="cyber-button secondary" href="/account" aria-disabled={gameplayBusy} onClick={event=>{if(gameplayBusy)event.preventDefault();}}>Manage Pup Account</a><button className="cyber-button secondary" disabled={refreshing||gameplayBusy} onClick={async()=>{setRefreshing(true);try{const ok=await onRefreshAccount();setMessage(ok?'Cloud progress refreshed.':'Unable to refresh right now. Please try again.');}catch{setMessage('Unable to refresh right now. Please try again.');}finally{setRefreshing(false);}}}>{refreshing?'Refreshing…':'Refresh cloud progress'}</button></div>
   <button className="cyber-button secondary" disabled={busy||gameplayBusy} onClick={async()=>{setBusy(true);try{const result=await onConnectAccount();if(result?.error)throw result.error;window.location.assign('/account');}catch{setMessage('Unable to sign out. Please try again.');setBusy(false);}}}>Sign out / switch account</button>
  </>)}
  {section('profile','Profile','Your display name and puppy collection',<>
   <form onSubmit={async event=>{event.preventDefault();if(busy)return;setBusy(true);setMessage('');try{await onUpdateAccountName(name.trim());setMessage('Display name saved to your Pup Account.');}catch{setMessage('Unable to save your name. Please try again.');}finally{setBusy(false);}}}><label className="web-field">Display name<input aria-label="Display name" autoComplete="nickname" value={name} minLength={2} maxLength={24} onChange={event=>setName(event.target.value)}/></label><button className="cyber-button primary" disabled={busy||gameplayBusy||name.trim().length<2}>{busy?'Saving…':'Save display name'}</button></form>
   <div className="web-setting-actions"><button className="cyber-button secondary" onClick={()=>onOpen('roster')}>Manage puppies & nicknames</button><button className="cyber-button secondary" onClick={()=>onOpen('achievements')}>Achievements & XP</button></div>
  </>)}
  {section('appearance','Appearance','Theme, color, text size and accessibility',<>
   <Choices label="Theme" value={g.themeMode} items={[["dark","Dark"],["light","Light"],["system","Follow System"]]} onChange={value=>pref('themeMode',value)}/>
   <fieldset className="web-setting-choices"><legend>Accent color</legend><div>{ACCENT_PRESETS.map(([title,color])=><label key={color} className="web-setting-option web-color-choice"><input type="radio" name={accentGroup} aria-label={title} checked={g.accentHex===color||(color==='#00B8F0'&&g.accentHex==='#00E5FF')} onChange={()=>pref('accentHex',color)}/><span style={{backgroundColor:color}}/>{title}</label>)}</div></fieldset>
   <button className="cyber-button secondary" onClick={()=>setCustom(!custom)}>Custom Color</button>
   {custom?<div className="web-setting-actions"><label className="web-field">HEX color<input aria-label="Custom accent HEX" value={hex} maxLength={7} onChange={event=>setHex(event.target.value)}/></label><button className="cyber-button secondary" disabled={!/^#[0-9a-f]{6}$/i.test(hex)} onClick={()=>{pref('accentHex',hex);setCustom(false);}}>Apply Custom Color</button></div>:null}
   <Choices label="Interface size" value={g.uiScale} items={[["compact","Compact"],["default","Default"],["large","Large"]]} onChange={value=>pref('uiScale',value)}/>
   <Toggle title="High contrast" detail="Strengthen text and border contrast." value={g.highContrast} onChange={value=>pref('highContrast',value)}/>
   <Toggle title="Reduced motion" detail="Reduce puppy and interface movement." value={g.reducedMotion} onChange={value=>pref('reducedMotion',value)}/>
  </>)}
  {section('play','Play & performance','Browser effects, input and display',<>
   <Toggle title="Tap animations" value={g.animationsEnabled} onChange={value=>pref('animationsEnabled',value)}/>
   <Toggle title="Animated UI" value={g.animatedUi} onChange={value=>pref('animatedUi',value)}/>
   <Toggle title="Button animations" value={g.buttonAnimations} onChange={value=>pref('buttonAnimations',value)}/>
   <Toggle title="Compact numbers" detail="Use K, M and B for large balances." value={g.compactNumbers} onChange={value=>pref('compactNumbers',value)}/>
   <Toggle title="Puppy mouse pointer" detail="For a mouse or trackpad; touch controls keep working." value={g.puppyPointerEnabled} onChange={value=>pref('puppyPointerEnabled',value)}/>
   <Choices label="Effects quality" value={g.performancePreset} items={[["automatic","Automatic"],["quality","Quality"],["battery_saver","Battery Saver"]]} onChange={value=>pref('performancePreset',value)}/>
   {document.fullscreenEnabled?<button className="cyber-button secondary" onClick={async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();onOpen('play');}catch{setMessage('Fullscreen is unavailable in this browser window.');}}}>{fullscreen?'Exit fullscreen':'Play in fullscreen'}</button>:<p>Fullscreen availability depends on your browser.</p>}
  </>)}
  {section('notifications','Notifications','Browser permissions and in-game reminders',<>
   <p>Browser permission: <strong>{notifications.permission==='granted'?'Allowed':notifications.permission==='denied'?'Blocked':notifications.permission==='unsupported'?'Not supported':'Not requested'}</strong></p>
   {notifications.permission==='default'?<button className="cyber-button secondary" onClick={()=>void notifications.request()}>Enable browser notifications</button>:null}
   {notifications.permission==='denied'?<p>To enable notifications, change this website’s permission in your browser’s site settings.</p>:null}
   {notifications.permission==='unsupported'?<p>This browser does not support desktop notifications. Your in-game inbox is still available.</p>:null}
   <p>Reminders run while this website is open.</p>
   <Toggle title="Daily reward reminders" value={g.dailyRewardNotifications} onChange={value=>pref('dailyRewardNotifications',value)}/>
   <Toggle title="Game event reminders" value={g.gameEventNotifications} onChange={value=>pref('gameEventNotifications',value)}/>
   <div className="web-setting-actions"><button className="cyber-button secondary" onClick={()=>{notifications.check();onOpen('notifications');}}>Open notification inbox</button><button className="cyber-button secondary" onClick={()=>{notifications.sendTest();setMessage('Test message added to your notification inbox.');}}>Send test notification</button></div>
   {notifications.error?<p role="alert">{notifications.error}</p>:null}
  </>)}
  {section('data','Browser data','Local preferences and downloaded roster information',<>
   <p>Appearance and notification preferences are saved only in this browser. Clearing browser storage resets these preferences; your Pup Account cloud progress is separate.</p>
   <p>{registry.items.length} puppies available · {registry.refreshing?'Refreshing roster…':registry.status}</p>
   <div className="web-setting-actions"><button className="cyber-button secondary" disabled={registry.refreshing} onClick={registry.refresh}>Refresh puppy roster</button><button className="cyber-button secondary" disabled={registry.refreshing} onClick={registry.clearCache}>Clear roster metadata cache</button></div>
   <p>Clearing roster metadata keeps your puppy collection and cloud save intact.</p>
   {!reset?<button className="cyber-button secondary" onClick={()=>setReset(true)}>Reset browser preferences</button>:<div className="web-reset-confirm"><p>Reset this browser’s appearance, effects and reminder preferences?</p><div className="web-setting-actions"><button className="cyber-button secondary" onClick={()=>{act({type:'resetSettings'});setReset(false);setMessage('Browser preferences reset. Your progress is unchanged.');}}>Confirm reset</button><button className="cyber-button secondary" onClick={()=>setReset(false)}>Cancel</button></div></div>}
  </>)}
  {section('about','About this website','Updates, privacy and terms',<>
   <p><strong>Puppy Clicker · Web Edition</strong><br/>Built by Harley’s Studios</p>
   <p>Reload the page to load the latest website update.</p>
   <button className="cyber-button secondary" disabled={gameplayBusy} onClick={()=>window.location.reload()}>Reload website</button>
   <div className="web-setting-actions"><a href="/assets/legal/privacy-policy.md" className="cyber-button secondary" target="_blank" rel="noreferrer">Privacy policy</a><a href="/assets/legal/terms-of-use.md" className="cyber-button secondary" target="_blank" rel="noreferrer">Terms of use</a></div>
  </>)}
 </div>;
}
