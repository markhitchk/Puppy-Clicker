export function crossplayDb(save, {owner=true, race=false}={}) {
 const account={id:'account',player_uuid:'player',active_installation_uuid:'install'};
 let row=save?{player_uuid:'player',account_uuid:'account',revision:1,save_data:structuredClone(save)}:null;
 let writes=0;
 const admin={from(table){
  let patch=null;const filters=[];
  const query={select(){return query},eq(k,v){filters.push([k,v]);return query},
   update(v){patch=v;return query},async insert(){return {error:null}},
   async maybeSingle(){
    if(table==='pupeye_installations')return {data:owner?{player_uuid:'player',active:true}:null,error:null};
    if(table!=='pup_account_saves')throw Error('Unexpected table '+table);
    if(patch){
     if(race||!row||filters.some(([k,v])=>row[k]!==v))return {data:null,error:null};
     row={...row,...structuredClone(patch)};writes++;
    }
    return {data:structuredClone(row),error:null};
   }};
  return query;
 }};
 return {admin,account,row:()=>structuredClone(row),writes:()=>writes};
}
