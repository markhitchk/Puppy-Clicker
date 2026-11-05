import React,{useState} from "react";
import "./PupEyeBrand.css";

// The committed /assets/logos/PupEye.png is byte-for-byte identical to
// pup-clinker/main/assets/logos/PupEye.png (Git blob 8e136af).
export default function PupEyeBrand({label="PupEye Anticheat",compact=false}){
 const [failed,setFailed]=useState(false);
 return <span className={"pupeye-brand"+(compact?" pupeye-brand--compact":"")}>
  {failed?<span className="pupeye-brand__fallback" aria-hidden="true">🛡️</span>:
   <img className="pupeye-brand__logo" src="/assets/logos/PupEye.png"
    alt="" aria-hidden="true" loading="lazy" decoding="async" onError={()=>setFailed(true)}/>}
  <span className="pupeye-brand__name">{label}</span>
 </span>;
}
