// Browser-only timing is an untrusted hint. Never use this as proof of cheating,
// a gameplay authorization signal, or the basis of automatic sanctions.
export function summarizeTapRegularity(timestamps){
 if(!Array.isArray(timestamps)||timestamps.length<81)return null;
 const times=timestamps.slice(-500);
 if(times.some(t=>!Number.isFinite(t)))return null;
 const windowMs=times[times.length-1]-times[0];
 if(windowMs<15000||windowMs>120000)return null;
 const intervals=[];
 for(let i=1;i<times.length;i++){
  const gap=times[i]-times[i-1];
  if(gap<=0)return null;
  intervals.push(gap);
 }
 const mean=windowMs/intervals.length;
 if(!Number.isFinite(mean)||mean<=0)return null;
 const variance=intervals.reduce((sum,gap)=>sum+(gap-mean)**2,0)/intervals.length;
 const coefficientVariation=Math.sqrt(variance)/mean;
 if(!Number.isFinite(coefficientVariation)||coefficientVariation>=0.075)return null;
 return {sampleCount:intervals.length,windowMs:Math.round(windowMs),
  coefficientVariation:Number(coefficientVariation.toFixed(5))};
}
