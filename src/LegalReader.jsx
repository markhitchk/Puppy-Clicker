import React,{useEffect,useMemo,useState} from "react";
import {LEGAL_DOCS,parseLegalMarkdown,safeLegalHref} from "./legalMarkdown.js";
import "./LegalReader.css";

// No raw HTML injection. Markdown source text is always rendered through React escaping.
function Inline({value}){
 const source=String(value||"");
 const parts=[];let cursor=0;
 const token=/\[([^\]\n]{1,180})\]\(([^)\n]{1,500})\)|\*\*([^*\n]+)\*\*|`([^`\n]+)`|\*([^*\n]+)\*/g;
 let match;
 while((match=token.exec(source))){
  if(match.index>cursor)parts.push(source.slice(cursor,match.index));
  if(match[1]!==undefined){
   const href=safeLegalHref(match[2]);
   parts.push(href?<a key={match.index} href={href} rel={href.startsWith("https://")?"noopener noreferrer":undefined} target={href.startsWith("https://")?"_blank":undefined}>{match[1]}</a>:match[1]);
  }else if(match[3]!==undefined)parts.push(<strong key={match.index}>{match[3]}</strong>);
  else if(match[4]!==undefined)parts.push(<code key={match.index}>{match[4]}</code>);
  else parts.push(<em key={match.index}>{match[5]}</em>);
  cursor=token.lastIndex;
 }
 if(cursor<source.length)parts.push(source.slice(cursor));
 return <>{parts}</>;
}
function RenderBlock({block}){
 if(block.kind==="heading"){
  const content=<Inline value={block.title}/>;
  if(block.level===1)return <h1 id={block.id}>{content}</h1>;
  if(block.level===2)return <h2 id={block.id}>{content}</h2>;
  if(block.level===3)return <h3 id={block.id}>{content}</h3>;
  return <h4 id={block.id}>{content}</h4>;
 }
 if(block.kind==="quote")return <blockquote><Inline value={block.text}/></blockquote>;
 if(block.kind==="rule")return <hr/>;
 if(block.kind==="code")return <pre><code>{block.text}</code></pre>;
 if(block.kind==="list"||block.kind==="ordered"){
  const Tag=block.kind==="ordered"?"ol":"ul";
  return <Tag>{block.items.map((text,i)=><li key={i}><Inline value={text}/></li>)}</Tag>;
 }
 return <p><Inline value={block.text}/></p>;
}
export default function LegalReader({type="privacy"}){
 const kind=Object.hasOwn(LEGAL_DOCS,type)?type:"privacy";
 const doc=LEGAL_DOCS[kind];
 const [state,setState]=useState({loading:true,text:"",error:""});
 const [contentsOpen,setContentsOpen]=useState(false);
 useEffect(()=>{
  const ctrl=new AbortController();
  setState({loading:true,text:"",error:""});
  fetch(doc.path,{signal:ctrl.signal,cache:"no-cache"}).then(async response=>{
   if(!response.ok)throw Error("DOCUMENT_UNAVAILABLE");
   const value=await response.text();
   if(value.length>300000)throw Error("DOCUMENT_TOO_LARGE");
   setState({loading:false,text:value,error:""});
  }).catch(error=>{
   if(error.name!=="AbortError")setState({loading:false,text:"",error:"Unable to load this document. Please try again."});
  });
  return()=>ctrl.abort();
 },[doc.path]);
 const parsed=useMemo(()=>parseLegalMarkdown(state.text),[state.text]);
 return <div className="legal-shell">
  <div className="legal-hero"><p className="eyebrow">🐾 PUPPY CLICKER · LEGAL</p><h1>Policies &amp; terms</h1>
   <p>Read official Puppy Clicker documents in a clean, accessible view.</p>
   <nav aria-label="Legal documents" className="legal-tabs">
    <a href="/legal/privacy" aria-current={kind==="privacy"?"page":undefined}>🔒 Privacy Policy</a>
    <a href="/legal/terms" aria-current={kind==="terms"?"page":undefined}>📜 Terms of Use</a>
    <a href="/privacy">Website activity notice</a>
   </nav>
  </div>
  {state.loading?<div className="legal-message" role="status">Loading {doc.title}…</div>:
   state.error?<div className="legal-message" role="alert">{state.error} <button onClick={()=>window.location.reload()}>Retry</button></div>:
   <div className="legal-layout">
    <aside className="legal-contents" aria-label="Document contents">
     <button className="legal-contents-toggle" aria-expanded={contentsOpen} onClick={()=>setContentsOpen(v=>!v)}>Contents <span aria-hidden="true">{contentsOpen?"−":"+"}</span></button>
     <nav className={contentsOpen?"is-open":""} aria-label="On this page">
      {parsed.headings.filter(h=>h.level>1).map(h=><a key={h.id} href={"#"+h.id} onClick={()=>setContentsOpen(false)}>{h.title}</a>)}
     </nav>
    </aside>
    <article className="legal-article" aria-label={doc.title}>
     <p className="legal-language">Document language: English. This is the original published text.</p>
     {parsed.blocks.map((block,i)=><RenderBlock key={block.id||i} block={block}/>)}
     <footer><a href={doc.path} target="_blank" rel="noopener noreferrer">View original Markdown source</a><span> · </span><button type="button" onClick={()=>window.print()}>Print document</button></footer>
    </article>
   </div>}
 </div>;
}
