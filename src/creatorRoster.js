export const creatorId=/^v[12]_creator_[a-f0-9]{24}$/;
export function normalizeCreatorRoster(rows){
 if(!Array.isArray(rows))return [];
 const seen=new Set(),items=[];
 for(const r of rows){
  if(!r||typeof r.id!=="string"||!creatorId.test(r.id)||seen.has(r.id)||r.generation!==r.id.slice(0,2)||typeof r.name!=="string"||!r.name.trim()||r.name.length>80||typeof r.description!=="string"||r.description.length>240)continue;
  seen.add(r.id);
  items.push({id:r.id,assetId:r.id,name:r.name,description:r.description,generation:r.generation,creatorCredit:typeof r.creatorCredit==="string"?r.creatorCredit.slice(0,80):null,emoji:"🎨",groupId:"creator",group:"creator",groupTitle:"Community Creations",groupOrder:4,number:items.length+1,free:false,redeemOnly:true,image:"/api/creator-art?id="+encodeURIComponent(r.id)});
 }
 return items;
}
export function mergeCreatorRoster(base,creations){
 const known=new Set(base.map(p=>p.id));return [...base,...creations.filter(p=>!known.has(p.id))];
}
