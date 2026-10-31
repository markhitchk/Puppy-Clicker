import React,{useCallback,useEffect,useState} from 'react';
import {client} from '../supabase.js';
import {useLanguage} from '../LanguagePicker.jsx';
import {privacyApi} from './privacyClient.js';
import './PrivacyCenter.css';

const RIGHTS=[
 {type:'access',en:'Access my data',es:'Acceder a mis datos'},
 {type:'export',en:'Request a portable copy',es:'Solicitar una copia portable'},
 {type:'rectify',en:'Correct inaccurate data',es:'Corregir datos inexactos'},
 {type:'restrict',en:'Restrict processing',es:'Limitar el tratamiento'},
 {type:'object',en:'Object to processing',es:'Oponerse al tratamiento'},
 {type:'erase',en:'Request account and data erasure',es:'Solicitar eliminación de cuenta y datos'}
];
const words={
 en:{title:'Privacy & Data',intro:'Review how Puppy Clicker handles your information and exercise your privacy rights.',login:'Sign in to submit or review privacy requests.',signIn:'Sign in to Pup Account',requests:'Your privacy requests',newRequest:'Submit a privacy request',choose:'Choose your request',note:'Additional details (optional)',submit:'Send request',sent:'Your request was received. This does not automatically delete your account or data.',empty:'No privacy requests yet.',deadline:'Response target',notice:'Privacy notices',activity:'Website activity notice',policy:'Full privacy policy',terms:'Terms of Use',rank:'Leaderboard privacy',back:'Back to account',review:'Requests are reviewed by Harley’s Studios. Some data may be retained where legally required. Permanent account deletion must be separately verified.',error:'Unable to load requests. Try again or contact support.',loading:'Loading privacy information…',reload:'Refresh',signedOut:'You can read privacy information without signing in.',status:'Status',submitted:'Submitted',warning:'Do not include passwords, login tokens or private keys.',eraseWarning:'This requests review of deletion across the website and Android. It does not immediately remove your cloud save.',onlyNecessary:'Essential website storage supports authentication and preferences. No optional advertising or analytics cookies are enabled by this Privacy Center.'},
 es:{title:'Privacidad y datos',intro:'Consulta cómo Puppy Clicker trata tus datos y ejerce tus derechos de privacidad.',login:'Inicia sesión para enviar o consultar solicitudes de privacidad.',signIn:'Iniciar sesión',requests:'Tus solicitudes de privacidad',newRequest:'Enviar una solicitud',choose:'Selecciona una solicitud',note:'Detalles adicionales (opcional)',submit:'Enviar solicitud',sent:'Se recibió tu solicitud. Esto no elimina automáticamente tu cuenta ni tus datos.',empty:'Aún no hay solicitudes.',deadline:'Fecha objetivo de respuesta',notice:'Avisos de privacidad',activity:'Aviso de actividad del sitio',policy:'Política de privacidad completa',terms:'Términos de uso',rank:'Privacidad de clasificación',back:'Volver a la cuenta',review:'Harley’s Studios revisa las solicitudes. Algunos datos pueden conservarse si la ley lo exige. La eliminación permanente necesita verificación adicional.',error:'No se pudieron cargar las solicitudes. Vuelve a intentarlo o contacta al soporte.',loading:'Cargando información…',reload:'Actualizar',signedOut:'Puedes leer la información de privacidad sin iniciar sesión.',status:'Estado',submitted:'Enviado',warning:'No incluyas contraseñas, tokens ni claves privadas.',eraseWarning:'Solicita una revisión de eliminación en web y Android. No borra inmediatamente tu partida en la nube.',onlyNecessary:'El almacenamiento esencial permite iniciar sesión y guardar preferencias. Este Centro no activa cookies opcionales de publicidad ni análisis.'}
};
export default function PrivacyCenter(){
 const {language}=useLanguage();
 const lang=language==='es'?'es':'en';
 const tr=words[lang];
 const [signedIn,setSignedIn]=useState(false),[loading,setLoading]=useState(true),[requests,setRequests]=useState([]),[busy,setBusy]=useState(false),[type,setType]=useState('access'),[note,setNote]=useState(''),[message,setMessage]=useState(''),[error,setError]=useState('');
 const refresh=useCallback(async()=>{
  if(!client){setSignedIn(false);setLoading(false);return;}
  try{
   const {data}=await client.auth.getSession();
   if(!data?.session){setSignedIn(false);setRequests([]);setError('');return;}
   setSignedIn(true);setRequests(await privacyApi(client,'list'));setError('');
  }catch{setError(tr.error);}finally{setLoading(false);}
 },[tr.error]);
 useEffect(()=>{void refresh();const sub=client?.auth.onAuthStateChange(()=>void refresh());return()=>sub?.data?.subscription?.unsubscribe();},[refresh]);
 async function submit(event){
  event.preventDefault();if(busy||!signedIn)return;
  setBusy(true);setError('');setMessage('');
  try{await privacyApi(client,'create',{type,note:note.trim()});setNote('');setMessage(tr.sent);await refresh();}
  catch{setError(tr.error);}finally{setBusy(false);}
 }
 return <article className="privacy-center">
  <header className="privacy-hero"><p className="privacy-eyebrow">🐾 PUPPY CLICKER · GDPR</p><h1>🔒 {tr.title}</h1><p>{tr.intro}</p></header>
  <div className="privacy-layout"><section className="privacy-card"><h2>{tr.notice}</h2><p>{tr.onlyNecessary}</p>
   <nav className="privacy-links"><a href="/legal/privacy">{tr.policy}</a><a href="/privacy">{tr.activity}</a><a href="/legal/terms">{tr.terms}</a><a href="/leaderboard">{tr.rank}</a><a href="/account">{tr.back}</a></nav>
  </section><section className="privacy-card">
  {loading?<p role="status">{tr.loading}</p>:!signedIn?<><p>{tr.signedOut} {tr.login}</p><a className="privacy-button" href="/account">{tr.signIn}</a></>:<>
   <h2>{tr.newRequest}</h2><p>{tr.review}</p>
   <form onSubmit={submit}><label htmlFor="privacy-right">{tr.choose}</label><select id="privacy-right" value={type} onChange={e=>setType(e.target.value)}>{RIGHTS.map(r=><option key={r.type} value={r.type}>{r[lang]}</option>)}</select>
    {type==='erase'?<p className="privacy-alert">{tr.eraseWarning}</p>:null}
    <label htmlFor="privacy-note">{tr.note}</label><textarea id="privacy-note" rows={3} maxLength={500} value={note} onChange={e=>setNote(e.target.value)} />
    <p className="privacy-small">{tr.warning}</p><button type="submit" disabled={busy}>{busy?tr.loading:tr.submit}</button>
   </form>
   {message?<p role="status" className="privacy-success">{message}</p>:null}
   {error?<p role="alert" className="privacy-alert">{error}</p>:null}
   <div className="privacy-list-head"><h2>{tr.requests}</h2><button onClick={()=>void refresh()} type="button">{tr.reload}</button></div>
   {!requests.length?<p>{tr.empty}</p>:<ul className="privacy-requests">{requests.map(r=><li key={r.requestId}><strong>{RIGHTS.find(x=>x.type===r.type)?.[lang]||r.type}</strong><span>{tr.status}: {r.state}</span><small>{tr.submitted}: {new Date(r.submittedAt).toLocaleDateString(lang)}</small><small>{tr.deadline}: {new Date(r.deadlineAt).toLocaleDateString(lang)}</small></li>)}</ul>}
  </>}
  </section></div></article>;
}
