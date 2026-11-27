import React,{useState} from 'react';
import {buildEnforcementEmail} from './enforcementEmail.js';

export default function AdminEnforcementNotice({notice,onClose}){
 const [feedback,setFeedback]=useState('');
 const email=buildEnforcementEmail(notice);
 const copy=async(kind,value)=>{
  try{
   if(kind==='formatted'){
    await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([email.html],{type:'text/html'}),'text/plain':new Blob([email.text],{type:'text/plain'})})]);
   }else await navigator.clipboard.writeText(value);
   setFeedback('Copied. Review and send manually in your email client.');
  }catch{setFeedback('Clipboard unavailable. Download HTML or select the text below.');}
 };
 const download=()=>{
  const url=URL.createObjectURL(new Blob([email.html],{type:'text/html;charset=utf-8'}));
  const a=document.createElement('a');
  a.href=url;a.download='puppy-clicker-'+notice.type+'-notice.html';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 return <section className="pup-admin-panel" aria-label="Generated enforcement email">
  <h2>Generated {notice.type} email</h2>
  <p className="pup-admin-note">Prepared from the restriction record. Not sent automatically. Review the public reason and recipient before sending.</p>
  <p><strong>From:</strong> harleytg.hq@gmail.com<br/><strong>To:</strong> {notice.contactEmail||'No support email on file'}<br/><strong>Subject:</strong> {email.subject}</p>
  <div className="pup-admin-row-actions">
   <button type="button" onClick={()=>void copy('formatted')}>Copy formatted email</button>
   <button type="button" onClick={()=>void copy('text',email.subject)}>Copy subject</button>
   <button type="button" onClick={()=>download()}>Download HTML</button>
   {onClose?<button type="button" onClick={onClose}>Close notice</button>:null}
  </div>
  <p role="status">{feedback}</p>
  <iframe title="Enforcement email preview" sandbox="" referrerPolicy="no-referrer" srcDoc={email.html}
   style={{width:'100%',height:650,border:'1px solid #315466',borderRadius:12,background:'#0b1a24'}}/>
  <details><summary>Plain-text email</summary><textarea readOnly rows={10} value={email.text} aria-label="Plain-text email" style={{width:'100%'}}/></details>
 </section>;
}
