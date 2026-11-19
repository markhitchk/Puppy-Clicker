import React,{useState} from 'react';
import manifest from './portraitManifest.json';

export default React.memo(function PuppyArtwork({id,name,uri,size,lazy=false,fullResolution=false,onUnavailable}){
 const bundled=manifest[id];
 const [failed,setFailed]=useState(false),[unavailable,setUnavailable]=useState(false);
 // Cards use responsive thumbnails. Asset viewers always request the full
 // resolution export, even when the browser reports a low device pixel ratio.
 const source=failed?(bundled?.fallback||uri):fullResolution
  ?(bundled?.full||bundled?.fallback||uri):(bundled?.small||uri);
 const srcSet=!failed&&!fullResolution&&bundled
  ?[['small',256],['large',640],['full',1536]]
   .filter(([key])=>bundled[key])
   .map(([key,nominalWidth])=>`${bundled[key]} ${bundled[key+'Width']||nominalWidth}w`)
   .join(', '):undefined;
 if(!source||unavailable)return <span className="puppy-art-unavailable" role="img" aria-label={name+' artwork unavailable'}>🐾</span>;
 return <img className="puppy-artwork" alt={name} src={source}
  srcSet={srcSet} sizes={srcSet?Math.round(size)+'px':undefined}
  width={size} height={size}
  loading={fullResolution?'eager':lazy?'lazy':'eager'} decoding="async"
  fetchPriority={fullResolution?'high':undefined}
  onError={()=>{if(!failed&&bundled)setFailed(true);else {setUnavailable(true);onUnavailable?.();}}}
  style={{width:size,height:size,objectFit:'contain',display:'block'}}/>;
});
