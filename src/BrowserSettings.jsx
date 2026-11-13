import React,{useEffect,useState} from 'react';
import LanguagePicker from './LanguagePicker.jsx';
import {ACCENT_PRESETS} from './native/src/engine/settings.js';
import {
 WEB_PREFERENCES_CHANGED,WEB_PREFERENCE_DEFAULTS,POINTER_SIZES,pointerThemeFor,
 loadWebPreferences,saveWebPreferences,updateWebPreference
} from './native/web/preferences.js';
import {GRAPHICS_BACKENDS} from './graphics/graphicsCapabilities.js';
import './BrowserSettings.css';

const qualityOptions=[['automatic','Automatic'],['quality','Quality'],['battery_saver','Battery saver']];
const themeOptions=[['system','Follow device'],['dark','Dark'],['light','Light']];
const pointerThemeOptions=[['auto','Match website'],['dark','Dark cursor'],['light','Light cursor']];
function pointerPreviewSource(prefs,state,systemDark){
 const size=POINTER_SIZES[prefs.uiScale]??64;
 const appearance=pointerThemeFor(prefs,systemDark);
 return `/assets/pointers/themes/puppy_pointer_${appearance}_${state}_${size}.png`;
}
function BrowserOption({label,detail,checked,onChange}){
 return <label className="browser-settings-option">
  <span><strong>{label}</strong>{detail?<small>{detail}</small>:null}</span>
  <input type="checkbox" role="switch" aria-label={label} checked={Boolean(checked)} onChange={event=>onChange(event.target.checked)}/>
 </label>;
}
function BrowserChoices({label,value,choices,onChange}){
 return <fieldset className="browser-settings-choices"><legend>{label}</legend>
  <div>{choices.map(([id,title])=><label key={id}>
   <input type="radio" name={'browser-'+label.replace(/\W/g,'-')} checked={value===id} onChange={()=>onChange(id)}/>
   <span>{title}</span></label>)}</div></fieldset>;
}
function graphicsSupport(){
 const names=[];
 try{if(globalThis.isSecureContext&&navigator.gpu)names.push('WebGPU');}catch{}
 try{
  const canvas=document.createElement('canvas');
  if(canvas.getContext('webgl2'))names.push('WebGL 2');
  else if(canvas.getContext('webgl'))names.push('WebGL 1');
 }catch{}
 names.push('Canvas 2D','CSS');
 return names;
}
export default function BrowserSettings(){
 const [prefs,setPrefs]=useState(()=>loadWebPreferences());
 const [systemDark,setSystemDark]=useState(()=>window.matchMedia('(prefers-color-scheme: dark)').matches);
 const [message,setMessage]=useState('');
 const [confirmReset,setConfirmReset]=useState(false);
 const [permission,setPermission]=useState(()=>typeof Notification==='undefined'?'unsupported':Notification.permission);
 const [fullscreen,setFullscreen]=useState(()=>Boolean(document.fullscreenElement));
 const [storage,setStorage]=useState(null);
 const [renderer,setRenderer]=useState('Automatic detection on Play');
 const [supports]=useState(graphicsSupport);
 useEffect(()=>{
  const sync=()=>setPrefs(loadWebPreferences());
  window.addEventListener(WEB_PREFERENCES_CHANGED,sync);
  window.addEventListener('storage',sync);
  return()=>{window.removeEventListener(WEB_PREFERENCES_CHANGED,sync);window.removeEventListener('storage',sync);};
 },[]);
 useEffect(()=>{
  const media=window.matchMedia('(prefers-color-scheme: dark)');
  const onTheme=()=>setSystemDark(media.matches);
  media.addEventListener('change',onTheme);
  return()=>media.removeEventListener('change',onTheme);
 },[]);
 useEffect(()=>{
  const onFullScreen=()=>setFullscreen(Boolean(document.fullscreenElement));
  document.addEventListener('fullscreenchange',onFullScreen);
  const check=()=>{
   const selected=document.documentElement.dataset.puppyGraphicsBackend;
   setRenderer(selected?selected.toUpperCase():'Automatic detection on Play');
  };
  check();
  const interval=window.setInterval(check,1500);
  navigator.storage?.estimate?.().then(estimate=>{
   if(estimate?.usage!=null&&estimate?.quota)
    setStorage({usage:estimate.usage,quota:estimate.quota});
  }).catch(()=>{});
  return()=>{document.removeEventListener('fullscreenchange',onFullScreen);window.clearInterval(interval);};
 },[]);
 const change=(name,value)=>{
  const updated=updateWebPreference(prefs,name,value);
  if(updated===prefs)return;
  if(!saveWebPreferences(updated)){setMessage('This browser could not save preferences. Check its storage permissions.');return;}
  setPrefs(updated);
  setMessage('Saved on this browser. Your Pup Account progress is unchanged.');
 };
 const askNotifications=async()=>{
  if(typeof Notification==='undefined'||typeof Notification.requestPermission!=='function')return;
  try{const result=await Notification.requestPermission();setPermission(result);
   setMessage(result==='granted'?'Browser notifications enabled.':result==='denied'?'Notifications were blocked. Change site permissions in your browser.':'Notification permission was not granted.');
  }catch{setMessage('Notifications are not available in this browser.');}
 };
 const size=bytes=>{
  if(bytes<1024*1024/10)return 'less than 0.1 MB';
  return (Math.round(bytes/1024/1024*10)/10).toLocaleString()+' MB';
 };
 return <div className="browser-settings-page">
  <header className="browser-settings-intro"><div><p className="eyebrow">🐾 PUPPY CLICKER · WEB</p><h1>Browser Settings</h1>
   <p>These settings work for guests and Pup Account players. Preferences stay on this browser; gameplay balances and cloud saves are separate.</p></div>
   <LanguagePicker/></header>
  <div className="browser-settings-grid">
   <section className="browser-settings-panel" aria-labelledby="browser-appearance"><h2 id="browser-appearance">🎨 Appearance & accessibility</h2>
    <BrowserChoices label="Theme" value={prefs.themeMode} choices={themeOptions} onChange={value=>change('themeMode',value)}/>
    <fieldset className="browser-settings-choices"><legend>Accent color</legend><div className="browser-settings-colors">
     {ACCENT_PRESETS.map(([name,color])=><label key={color} title={name}>
      <input type="radio" name="browser-accent" aria-label={name} checked={prefs.accentHex===color||(color==='#00B8F0'&&prefs.accentHex==='#00E5FF')} onChange={()=>change('accentHex',color)}/>
      <span style={{background:color,borderRadius:99,width:23,height:23,display:'inline-block'}}/>{name}</label>)}
    </div></fieldset>
    <BrowserChoices label="Interface size" value={prefs.uiScale} choices={[["compact","Compact"],["default","Default"],["large","Large"]]} onChange={value=>change('uiScale',value)}/>
    <BrowserOption label="High contrast" checked={prefs.highContrast} onChange={value=>change('highContrast',value)}/>
    <BrowserOption label="Reduced motion" detail="Disable animated GPU effects and reduce other game movement." checked={prefs.reducedMotion} onChange={value=>change('reducedMotion',value)}/>
   </section>
   <section className="browser-settings-panel browser-pointer-panel" id="puppy-pointer-settings" aria-labelledby="browser-pointer-heading">
    <h2 id="browser-pointer-heading">🖱️ Puppy mouse pointer</h2>
    <p className="browser-settings-detail">Customize the actual mouse or trackpad cursor. Changes apply across Puppy Clicker immediately and remain on this browser.</p>
    <BrowserChoices label="Mouse pointer" value={prefs.puppyPointerEnabled?'puppy':'system'} choices={[["system","System pointer"],["puppy","Original Puppy pointer"]]} onChange={value=>change('puppyPointerEnabled',value==='puppy')}/>
    <p className="browser-settings-detail">System uses your operating system's normal arrow and text cursor. Puppy mode uses the original Puppy Clicker pointer pack. Touch input stays unchanged.</p>
    <p className="browser-settings-detail" role="status">Pointer size follows <strong>Interface size</strong>: Compact 48 px · Default 64 px · Large 96 px. Current: <strong>{POINTER_SIZES[prefs.uiScale]??64} px</strong>.</p>
    {prefs.puppyPointerEnabled?<div className="browser-pointer-controls">
     <BrowserChoices label="Pointer theme" value={prefs.puppyPointerTheme} choices={pointerThemeOptions} onChange={value=>change('puppyPointerTheme',value)}/>
     <BrowserOption label="Highlight mouse clicks" detail="Show a brief accent-color ring at each click. Disabled with reduced motion." checked={prefs.puppyPointerClickHighlight} onChange={value=>change('puppyPointerClickHighlight',value)}/>
     <div className="browser-pointer-preview" data-cursor-theme={pointerThemeFor(prefs,systemDark)} aria-label="Puppy pointer theme preview">
      <strong>Preview · {pointerThemeFor(prefs,systemDark)==='dark'?'Dark cursor':'Light cursor'}</strong>
      <div className="browser-pointer-preview-grid">
       {([['default','Normal'],['hover','Hover'],['click','Click']]).map(([state,title])=>
        <div className="browser-pointer-preview-tile" key={state}>
         <img src={pointerPreviewSource(prefs,state,systemDark)} alt="" width={POINTER_SIZES[prefs.uiScale]??64} height={POINTER_SIZES[prefs.uiScale]??64}/>
         <span>{title}</span>
        </div>)}
      </div>
      <small>Dark cursor has a deep outline; Light cursor has a bright outline. The preview and actual cursor use the same PNGs. Some browsers restrict 96 px custom cursors.</small>
     </div>
     <button className="browser-settings-action secondary" type="button" onClick={()=>{
      const next={...prefs,puppyPointerTheme:WEB_PREFERENCE_DEFAULTS.puppyPointerTheme,puppyPointerClickHighlight:WEB_PREFERENCE_DEFAULTS.puppyPointerClickHighlight};
      if(saveWebPreferences(next)){setPrefs(next);setMessage('Puppy pointer theme and click highlight reset.');}
      else setMessage('Could not save pointer defaults. Check browser storage permissions.');
     }}>Reset pointer customization</button>
    </div>:<p className="browser-settings-detail" role="status">System pointer active. Custom Puppy theme and preview controls are hidden until you select Original Puppy pointer.</p>}
   </section>
   <section className="browser-settings-panel" aria-labelledby="browser-performance"><h2 id="browser-performance">🎮 Graphics & performance</h2>
    <p><strong>Graphics mode: Automatic</strong> — WebGPU → WebGL 2 → WebGL 1 → Canvas 2D → CSS. Your browser chooses the underlying Vulkan, Metal or Direct3D backend.</p>
    <p className="browser-settings-detail">Supported on this browser: {supports.join(' · ')}</p>
    <p className="browser-settings-detail" role="status">Play screen renderer: {renderer}</p>
    <BrowserChoices label="Effects quality" value={prefs.performancePreset} choices={qualityOptions} onChange={value=>change('performancePreset',value)}/>
    <BrowserOption label="Animated game interface" checked={prefs.animatedUi} onChange={value=>change('animatedUi',value)}/>
    <BrowserOption label="Tap animations" checked={prefs.animationsEnabled} onChange={value=>change('animationsEnabled',value)}/>
    <BrowserOption label="Button animations" checked={prefs.buttonAnimations} onChange={value=>change('buttonAnimations',value)}/>
    <BrowserOption label="Compact numbers" checked={prefs.compactNumbers} onChange={value=>change('compactNumbers',value)}/>
   </section>
   <section className="browser-settings-panel" aria-labelledby="browser-notifications"><h2 id="browser-notifications">🔔 Notifications & display</h2>
    <p>Browser notification permission: <strong>{permission==='granted'?'Allowed':permission==='denied'?'Blocked':permission==='unsupported'?'Unavailable':'Not requested'}</strong></p>
    {permission==='default'?<button type="button" className="browser-settings-action" onClick={askNotifications}>Request notification permission</button>:null}
    {permission==='denied'?<p className="browser-settings-detail">Use your browser's website permissions to unblock notifications.</p>:null}
    <BrowserOption label="Daily reward reminders" checked={prefs.dailyRewardNotifications} onChange={value=>change('dailyRewardNotifications',value)}/>
    <BrowserOption label="Game event reminders" checked={prefs.gameEventNotifications} onChange={value=>change('gameEventNotifications',value)}/>
    {document.fullscreenEnabled?<button className="browser-settings-action" type="button" onClick={async()=>{
     try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}
     catch{setMessage('Fullscreen is unavailable in this browser.');}
    }}>{fullscreen?'Exit fullscreen':'Enter fullscreen'}</button>:<p className="browser-settings-detail">Fullscreen is controlled by your browser.</p>}
   </section>
   <section className="browser-settings-panel" aria-labelledby="browser-storage"><h2 id="browser-storage">💾 Browser storage & privacy</h2>
    <p>Local preferences are separate from your Pup Account cloud save. Pending gameplay actions may be stored in IndexedDB until Supabase confirms them.</p>
    {storage?<p className="browser-settings-detail">Estimated site storage used: {size(storage.usage)}. Browser-reported origin quota: {size(storage.quota)} (this is a limit, not free device space).</p>:null}
    <p className="browser-settings-detail">Never clear website data while gameplay is still syncing. This page does not delete your queued actions.</p>
    {!confirmReset?<button className="browser-settings-action" type="button" onClick={()=>setConfirmReset(true)}>Reset browser preferences</button>:<div className="browser-settings-reset">
     <p>Reset appearance and performance preferences? Game progress is not changed.</p>
     <button className="browser-settings-action" onClick={()=>{
      if(saveWebPreferences(WEB_PREFERENCE_DEFAULTS)){setPrefs(loadWebPreferences());setMessage('Browser preferences reset.');}
      else setMessage('Unable to reset preferences: site storage is unavailable.');
      setConfirmReset(false);
     }}>Confirm reset</button><button className="browser-settings-action secondary" onClick={()=>setConfirmReset(false)}>Cancel</button>
    </div>}
    <div className="browser-settings-links"><a href="/play">🐾 Play</a><a href="/play?=demo">🎮 Guest demo</a><a href="/account">👤 Pup Account</a><a href="/legal/privacy">Privacy policy</a></div>
   </section>
  </div>
  {message?<p className="browser-settings-feedback" role="status">{message}</p>:null}
 </div>;
}
