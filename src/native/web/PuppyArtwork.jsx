import React,{useState} from 'react';
import manifest from './portraitManifest.json';

export default React.memo(function PuppyArtwork({id,name,uri,size,lazy=false}){
 const bundled=manifest[id];
 const [failed,setFailed]=useState(false),[unavailable,setUnavailable]=useState(false);
 const source=failed?(bundled?.fallback||uri):(bundled?.small||uri);
 if(!source||unavailable)return <span className="puppy-art-unavailable" role="img" aria-label={name+' artwork unavailable'}>🐾</span>;
 return <img className="puppy-artwork" alt={name} src={source}
  srcSet={!failed&&bundled?`${bundled.small} 256w, ${bundled.large} 640w`:undefined}
  sizes={Math.round(size)+'px'} width={size} height={size}
  loading={lazy?'lazy':'eager'} decoding="async"
  onError={()=>{if(!failed&&bundled)setFailed(true);else setUnavailable(true);}}
  style={{width:size,height:size,objectFit:'contain',display:'block'}}/>;
});
