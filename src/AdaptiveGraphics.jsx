import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {loadWebPreferences,WEB_PREFERENCES_CHANGED} from './native/web/preferences.js';
import {mountAdaptiveGraphics} from './graphics/adaptiveRenderer.js';

function GraphicsLayer(){
 const host=useRef(null);
 useEffect(()=>{
  const node=host.current;
  if(!node)return;
  const motion=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let dispose=()=>{};
  const start=()=>{
   dispose();
   const preferences=loadWebPreferences();
   const reduced=Boolean(motion?.matches||preferences.reducedMotion||
    preferences.animatedUi===false||preferences.animationsEnabled===false);
   dispose=mountAdaptiveGraphics(node,{reducedMotion:reduced});
  };
  start();
  motion?.addEventListener?.('change',start);
  window.addEventListener(WEB_PREFERENCES_CHANGED,start);
  window.addEventListener('storage',start);
  return()=>{
   motion?.removeEventListener?.('change',start);
   window.removeEventListener(WEB_PREFERENCES_CHANGED,start);
   window.removeEventListener('storage',start);
   dispose();
  };
 },[]);
 return <div className="pup-graphics-layer" ref={host} aria-hidden="true"/>;
}

export default function AdaptiveGraphics(){
 const [stage,setStage]=useState(null);
 useEffect(()=>{
  const main=document.querySelector('.game-mount');
  if(!main)return;
  const findStage=()=>{
   const next=main.querySelector('.cyber-play-stage');
   setStage(previous=>previous===next?previous:next);
  };
  const observer=new MutationObserver(findStage);
  observer.observe(main,{childList:true,subtree:true});
  findStage();
  return()=>{observer.disconnect();setStage(null);};
 },[]);
 return stage?createPortal(<GraphicsLayer/>,stage):null;
}
