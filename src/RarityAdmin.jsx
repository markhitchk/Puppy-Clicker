import React,{useEffect,useState} from 'react';
import {pupWebApi} from './pupWebApi.js';
import {rarityLabels} from './puppyRarity.js';

const classes=['standard','event','code','community','developer','retired','restricted'];
const assignment=row=>row?.version?[rarityLabels[row.rarity],row.acquisition,row.published?'Published':'Draft'].join(' · '):'Unassigned';
export default function RarityAdmin(){
 const [data,setData]=useState(null),[edit,setEdit]=useState(null),[reason,setReason]=useState('');
 const [notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 async function refresh(id){
  const next=await pupWebApi({action:'rarity-read'});
  setData(next);setEdit(next.rows.find(p=>p.puppy_id===id)||next.rows[0]);
 }
 useEffect(()=>{refresh().catch(()=>setNotice('Could not load the rarity catalog.'));},[]);
 async function save(e){
  e.preventDefault();setBusy(true);setNotice('');
  try{
   await pupWebApi({action:'rarity-update',puppyId:edit.puppy_id,version:edit.version,
    rarity:edit.rarity,acquisition:edit.acquisition,published:edit.published,reason,operationId:crypto.randomUUID()});
   await refresh(edit.puppy_id);setReason('');setNotice('Changes saved.');
  }catch(err){setNotice(err.message==='VERSION_CONFLICT'?'Another change was saved. Reload the catalog before editing.':err.message);}
  finally{setBusy(false);}
 }
 const current=data?.rows.find(row=>row.puppy_id===edit?.puppy_id);
 return <section className="pup-admin-panel"><h2>Puppy rarities</h2>
 {notice&&<p role="status">{notice}</p>}
 {edit&&<form onSubmit={save} className="pup-admin-gift-form">
 <label>Puppy <select value={edit.puppy_id} onChange={e=>{setEdit(data.rows.find(p=>p.puppy_id===e.target.value));setReason('');}}>
 {data.rows.map(p=><option key={p.puppy_id}>{p.puppy_id}</option>)}</select></label>
 <p>Current assignment · {assignment(current)}</p>
 {data.canEdit&&<><label>Rarity <select value={edit.rarity} onChange={e=>setEdit({...edit,rarity:e.target.value,acquisition:e.target.value==='unobtainable'?'restricted':edit.rarity==='unobtainable'?'standard':edit.acquisition})}>
 {Object.entries(rarityLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
 <label>Acquisition <select value={edit.acquisition} onChange={e=>setEdit({...edit,acquisition:e.target.value})}>
 {classes.filter(c=>['developer','retired','restricted'].includes(c)===(edit.rarity==='unobtainable')).map(c=><option key={c}>{c}</option>)}</select></label>
 <label><input type="checkbox" checked={edit.published} onChange={e=>setEdit({...edit,published:e.target.checked})}/> Published</label>
 <label>Reason <input required maxLength={300} value={reason} onChange={e=>setReason(e.target.value)}/></label>
 <button disabled={busy||!reason.trim()} type="submit">Save changes</button></>}
 <button type="button" disabled={busy} onClick={()=>refresh(edit.puppy_id).catch(()=>setNotice('Reload failed.'))}>Reload catalog</button>
 </form>}
 {data&&<><h3>Recent changes and gifts</h3>{data.history.length===0?<p>No changes recorded.</p>:
 <ul>{data.history.map(h=><li key={h.created_at+h.puppy_id}>{new Date(h.created_at).toLocaleString()} · {h.puppy_id} · {h.action==='gift'?'Gift granted':assignment(h.before_value)+' → '+assignment(h.after_value)} · {h.reason}</li>)}</ul>}</>}
 </section>;
}
