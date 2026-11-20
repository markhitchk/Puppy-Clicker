import React,{useEffect,useState} from 'react';
import './FooterSystemClock.css';
const options={month:'long',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',second:'2-digit',timeZoneName:'short'};
export default function FooterSystemClock(){
 const [now,setNow]=useState(()=>Date.now());
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 const date=new Date(now),utc=new Intl.DateTimeFormat('en-US',{...options,timeZone:'UTC'}).format(date),local=new Intl.DateTimeFormat(undefined,options).format(date);
 return <div className="site-footer-clock" aria-label="System time"><div><span>System time (UTC)</span><time dateTime={date.toISOString()}>{utc}</time></div><div><span>Your local time</span><time dateTime={date.toISOString()}>{local}</time></div></div>;
}
