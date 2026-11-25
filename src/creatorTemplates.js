// The same generated roster manifest and names consumed by PupDex.
import roster from './data/roster.js';
import {LEGACY_V6_PUPPIES} from './native/src/engine/rosterV6.js';
const names=new Map(LEGACY_V6_PUPPIES.map(p=>[p.id,p.name]));
const restricted=new Set(['dev_pup','v2_dev_pup','v2_harleytg']);
export const creatorTemplates=Object.freeze(roster.filter(p=>['v1','v2'].includes(p.group)&&!restricted.has(p.id)&&/^[a-z0-9_]+$/.test(p.id)&&/^\/assets\/v[12]\/v[12]_[a-z0-9_]+\.png$/.test(p.image)).map(p=>Object.freeze({id:p.id,name:names.get(p.id)||p.name,generation:p.group,source:p.image,preview:p.image.replace('/assets/','/assets/transparent/'),url:'/assets/creator/roster_'+p.id+'.png',width:256,height:256})));
export const findCreatorTemplate=id=>creatorTemplates.find(p=>p.id===id);
export const creatorTemplateHref=id=>findCreatorTemplate(id)?'/creator?pup='+encodeURIComponent(id):null;
