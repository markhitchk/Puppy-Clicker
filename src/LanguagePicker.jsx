import React,{useCallback,useEffect,useState} from "react";
import {LANGUAGE_CHANGED,readLanguage,t,writeLanguage} from "./communityI18n.js";
export function useLanguage(){
 const [language,setLanguage]=useState(()=>readLanguage());
 useEffect(()=>{
  const change=event=>setLanguage(event?.detail?.language||readLanguage());
  const storage=()=>setLanguage(readLanguage());
  window.addEventListener(LANGUAGE_CHANGED,change);
  window.addEventListener("storage",storage);
  document.documentElement.lang=language;
  return()=>{window.removeEventListener(LANGUAGE_CHANGED,change);window.removeEventListener("storage",storage);};
 },[language]);
 const translate=useCallback((key,params)=>t(language,key,params),[language]);
 return {language,t:translate,setLanguage:writeLanguage};
}
export default function LanguagePicker({compact=false}){
 const {language,setLanguage,t:tr}=useLanguage();
 return <label className={"puppy-language-picker"+(compact?" compact":"")}>
  <span>{tr("language")}</span>
  <select aria-label={tr("selectLanguage")} value={language} onChange={event=>setLanguage(event.target.value)}>
   <option value="en">English</option><option value="es">Español</option>
  </select>
 </label>;
}
