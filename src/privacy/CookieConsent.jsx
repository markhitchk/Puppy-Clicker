import React,{useEffect,useRef,useState} from "react";
import {useLanguage} from "../LanguagePicker.jsx";
import {client} from "../supabase.js";
import {
 COOKIE_CHOICE_CHANGED,COOKIE_PREFERENCES_OPEN,readCookieChoice,
 saveCookieChoice,openCookiePreferences
} from "./cookiePreferences.js";
import {loadWebPreferences,saveWebPreferences,resetVolatileWebPreferences} from "../native/web/preferences.js";
import {readLanguage,writeLanguage,resetVolatileLanguage} from "../communityI18n.js";
import {clearSelectedWebsiteData} from "./clearWebsiteData.js";

const copy={
 en:{
  title:"Cookies & website storage",intro:"Puppy Clicker uses essential browser storage for your Pup Account, PupEye protection, and safe gameplay syncing. We do not run advertising or optional analytics cookies.",
  bannerTitle:"Your privacy, your choice",banner:"Essential storage keeps your account and unsynced game actions safe. Optional customization remembers your display settings on this browser. No advertising or analytics trackers are enabled.",
  essential:"Essential storage",essentialDetail:"Always on · encrypted browser sign-in session, safety checks, and pending gameplay actions",
  customization:"Remember browser customization",customizationDetail:"Optional · theme, interface, cursor, graphics and language preferences. Turn off to use defaults after reloading; changes can still work in this tab.",
  analytics:"Analytics cookies",advertising:"Advertising cookies",inactive:"Not in use · cannot be enabled",
  only:"Necessary only",allow:"Allow customization",manage:"Manage choices",save:"Save choices",
  last:"Saved on this browser",change:"Change cookie choices",stored:"No preference has been saved yet",
  security:"Saved Pup Account sessions are encrypted with AES-GCM where supported. This is browser storage encryption, not an HttpOnly cookie. Site providers may set their own security cookies.",
  policy:"Read Privacy Policy",close:"Close cookie preferences",failure:"Your browser blocked saving this choice. Check website storage permissions.",
  dataTitle:"Clear selected website data",dataIntro:"Choose exactly what to remove. This never deletes your Pup Account, cloud progress, purchases, or pending IndexedDB gameplay actions.",
  customizationClear:"Saved appearance & language settings",notifications:"Notification read / hidden display state",
  reminder:"Android app reminder dismissal",decision:"Saved cookie choice",login:"This browser's Pup Account login",
  clear:"Clear selected data",confirm:"Confirm and clear",cancel:"Cancel",nothing:"Select at least one category.",
  warning:"Sign-out may pause pending gameplay syncing until you sign in again. Do not sign out before the game finishes syncing.",
  done:"Selected local data cleared. Reload pages if any view does not update immediately.",clearError:"Couldn't clear selected data. Check sign-in and storage permissions."
 },
 es:{
  title:"Cookies y almacenamiento web",intro:"Puppy Clicker usa almacenamiento esencial para tu cuenta, protección PupEye y sincronización del juego. No utiliza cookies publicitarias ni de análisis opcionales.",
  bannerTitle:"Tu privacidad, tu elección",banner:"El almacenamiento esencial mantiene tu cuenta y las acciones pendientes. La personalización opcional recuerda tus ajustes. No hay rastreadores publicitarios ni de análisis activos.",
  essential:"Almacenamiento esencial",essentialDetail:"Siempre activo · sesión cifrada, seguridad y acciones pendientes del juego",
  customization:"Recordar mis ajustes",customizationDetail:"Opcional · tema, interfaz, cursor, gráficos e idioma. Si lo desactivas, tus cambios solo durarán esta pestaña.",
  analytics:"Cookies analíticas",advertising:"Cookies publicitarias",inactive:"No se usan · no se pueden activar",
  only:"Solo lo necesario",allow:"Permitir personalización",manage:"Administrar opciones",save:"Guardar opciones",
  last:"Guardado en este navegador",change:"Cambiar opciones",stored:"Todavía no has guardado preferencias",
  security:"Las sesiones guardadas usan cifrado AES-GCM cuando está disponible. No son cookies HttpOnly. Los proveedores pueden usar cookies de seguridad.",
  policy:"Leer la política de privacidad",close:"Cerrar preferencias",failure:"El navegador no pudo guardar esta decisión. Revisa los permisos de almacenamiento.",
  dataTitle:"Borrar datos seleccionados",dataIntro:"Elige exactamente qué borrar. No se borran tu cuenta, progreso en la nube ni acciones pendientes del juego.",
  customizationClear:"Apariencia e idioma guardados",notifications:"Estado de notificaciones leído/oculto",
  reminder:"Preferencias del aviso de Android",decision:"Decisión sobre cookies",login:"Sesión de Pup Account de este navegador",
  clear:"Borrar datos seleccionados",confirm:"Confirmar y borrar",cancel:"Cancelar",nothing:"Selecciona al menos una categoría.",
  warning:"Cerrar sesión puede pausar la sincronización hasta volver a iniciarla. Comprueba que el juego haya terminado de sincronizar.",
  done:"Datos seleccionados eliminados. Recarga las páginas si alguna vista no se actualiza.",clearError:"No se pudieron borrar los datos. Comprueba el inicio de sesión y los permisos."
 }
};
function useCookieChoice(){
 const [choice,setChoice]=useState(()=>readCookieChoice());
 useEffect(()=>{
  const refresh=()=>setChoice(readCookieChoice());
  window.addEventListener(COOKIE_CHOICE_CHANGED,refresh);
  window.addEventListener("storage",refresh);
  return()=>{window.removeEventListener(COOKIE_CHOICE_CHANGED,refresh);window.removeEventListener("storage",refresh);};
 },[]);
 return choice;
}
export default function CookieConsent(){
 const {language}=useLanguage(),tr=copy[language==="es"?"es":"en"];
 const choice=useCookieChoice();
 const [open,setOpen]=useState(false);
 const [functional,setFunctional]=useState(()=>readCookieChoice()?.functional??false);
 const [error,setError]=useState("");
 const dialogRef=useRef(null);
 useEffect(()=>{
  const show=()=>{setFunctional(readCookieChoice()?.functional??false);setError("");setOpen(true);};
  window.addEventListener(COOKIE_PREFERENCES_OPEN,show);
  return()=>window.removeEventListener(COOKIE_PREFERENCES_OPEN,show);
 },[]);
 useEffect(()=>{
  if(!open)return;
  dialogRef.current?.focus();
  const escape=event=>{if(event.key==="Escape")setOpen(false);};
  window.addEventListener("keydown",escape);
  return()=>window.removeEventListener("keydown",escape);
 },[open]);
 const choose=enabled=>{
  // Preserve any existing or temporary personalization when explicitly allowed.
  const priorPrefs=loadWebPreferences();
  const priorLanguage=readLanguage();
  if(!enabled){resetVolatileWebPreferences();resetVolatileLanguage();}
  const saved=saveCookieChoice(enabled);
  if(!saved){setError(tr.failure);return;}
  if(enabled){saveWebPreferences(priorPrefs);writeLanguage(priorLanguage);}
  setError("");setOpen(false);
 };
 if(globalThis.location?.pathname==="/auth/discord/callback")return null;
 return <>
  {!choice&&!open?<aside className="puppy-cookie-banner" aria-label={tr.bannerTitle}>
   <div><strong>🍪 {tr.bannerTitle}</strong><p>{tr.banner}</p></div>
   <div className="puppy-cookie-actions">
    <button type="button" className="puppy-cookie-btn secondary" onClick={()=>choose(false)}>{tr.only}</button>
    <button type="button" className="puppy-cookie-btn" onClick={()=>choose(true)}>{tr.allow}</button>
    <button type="button" className="puppy-cookie-btn secondary" onClick={()=>setOpen(true)}>{tr.manage}</button>
   </div>
   {error?<p className="puppy-cookie-error" role="alert">{error}</p>:null}
  </aside>:null}
  {open?<div className="puppy-cookie-backdrop">
   <section className="puppy-cookie-dialog" role="dialog" aria-modal="true" aria-labelledby="puppy-cookie-title" tabIndex={-1} ref={dialogRef}>
    <div className="puppy-cookie-dialog-head"><h2 id="puppy-cookie-title">🍪 {tr.title}</h2>
     <button type="button" aria-label={tr.close} className="puppy-cookie-close" onClick={()=>setOpen(false)}>×</button></div>
    <p>{tr.intro}</p>
    <div className="puppy-cookie-category"><span><strong>🔐 {tr.essential}</strong><small>{tr.essentialDetail}</small></span><strong>✓</strong></div>
    <label className="puppy-cookie-category"><span><strong>⚙️ {tr.customization}</strong><small>{tr.customizationDetail}</small></span>
     <input type="checkbox" role="switch" aria-label={tr.customization} checked={functional} onChange={event=>setFunctional(event.target.checked)}/></label>
    <div className="puppy-cookie-category"><span><strong>📊 {tr.analytics}</strong><small>{tr.inactive}</small></span><span>—</span></div>
    <div className="puppy-cookie-category"><span><strong>📢 {tr.advertising}</strong><small>{tr.inactive}</small></span><span>—</span></div>
    <p className="puppy-cookie-note">{tr.security}</p>
    <a className="pup-link-button" href="/legal/privacy">{tr.policy}</a>
    {error?<p className="puppy-cookie-error" role="alert">{error}</p>:null}
    <div className="puppy-cookie-actions">
     <button type="button" className="puppy-cookie-btn secondary" onClick={()=>choose(false)}>{tr.only}</button>
     <button type="button" className="puppy-cookie-btn" onClick={()=>choose(functional)}>{tr.save}</button>
    </div>
   </section>
  </div>:null}
 </>;
}
export function CookiePrivacySettings(){
 const {language}=useLanguage(),tr=copy[language==="es"?"es":"en"];
 const choice=useCookieChoice();
 const [selected,setSelected]=useState({});
 const [confirm,setConfirm]=useState(false);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const [error,setError]=useState("");
 const categories=[
  ["customization",tr.customizationClear],["notificationDisplay",tr.notifications],
  ["appReminder",tr.reminder],["cookieDecision",tr.decision],["login",tr.login]
 ];
 const wanted=categories.filter(([id])=>selected[id]).map(([id])=>id);
 const clear=async()=>{
  setError("");setMessage("");setBusy(true);
  try{
   await clearSelectedWebsiteData(wanted,{auth:client?.auth});
   setMessage(tr.done);setSelected({});setConfirm(false);
  }catch{setError(tr.clearError);}finally{setBusy(false);}
 };
 return <div className="puppy-cookie-settings" data-testid="cookie-privacy-settings">
  <h3>🍪 {tr.title}</h3>
  <p className="browser-settings-detail">{tr.intro}</p>
  <p className="browser-settings-detail">{choice?tr.last+": "+new Date(choice.savedAt).toLocaleDateString(language==="es"?"es-ES":"en-US"):tr.stored}</p>
  <p className="browser-settings-detail"><strong>{tr.essential}:</strong> {tr.essentialDetail}</p>
  <p className="browser-settings-detail"><strong>{tr.customization}:</strong> {choice?.functional?tr.allow:tr.only}</p>
  <p className="browser-settings-detail">{tr.analytics} / {tr.advertising}: {tr.inactive}</p>
  <button type="button" className="browser-settings-action" onClick={openCookiePreferences}>{tr.change}</button>
  <h3>🗑️ {tr.dataTitle}</h3>
  <p className="browser-settings-detail">{tr.dataIntro}</p>
  <div className="puppy-cookie-clear-categories">
   {categories.map(([id,label])=><label key={id}><input type="checkbox" checked={Boolean(selected[id])}
    disabled={busy} onChange={event=>{setSelected(current=>({...current,[id]:event.target.checked}));setConfirm(false);}}/>{label}</label>)}
  </div>
  {selected.login?<p className="puppy-cookie-error">{tr.warning}</p>:null}
  {!confirm?<button className="browser-settings-action secondary" type="button" disabled={!wanted.length||busy} onClick={()=>setConfirm(true)}>{tr.clear}</button>:
   <div className="puppy-cookie-clear-confirm">
    <p>{tr.dataIntro}</p>
    <button className="browser-settings-action" type="button" disabled={busy||!wanted.length} onClick={()=>void clear()}>{busy?"…":tr.confirm}</button>
    <button className="browser-settings-action secondary" type="button" disabled={busy} onClick={()=>setConfirm(false)}>{tr.cancel}</button>
   </div>}
  {error?<p role="alert" className="puppy-cookie-error">{error}</p>:null}
  {message?<p role="status" className="browser-settings-feedback">{message}</p>:null}
 </div>;
}
