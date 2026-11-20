import {ADVENT_YEAR} from '../../../supabase/functions/_shared/advent-calendar.js';
export function adventUnlockTime(day,locale=undefined,timeZone=undefined){
 const timestamp=Date.UTC(ADVENT_YEAR,11,day);
 const local=new Intl.DateTimeFormat(locale,{weekday:'short',month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short',...(timeZone?{timeZone}:{})}).format(timestamp);
 const utc=new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZone:'UTC'}).format(timestamp)+' UTC';
 return {timestamp,utc,local};
}
