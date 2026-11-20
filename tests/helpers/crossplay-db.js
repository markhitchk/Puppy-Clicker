export function crossplayDb(save, {owner=true, race=false, webOnly=false,eventSettings={all_events:true,christmas_2026:true,winter_effects:true}}={}) {
 const account={id:'account',player_uuid:'player',
  active_installation_uuid:webOnly?null:'install',origin_platform:webOnly?'web':'android'};
 let row=save?{player_uuid:'player',account_uuid:'account',revision:1,save_data:structuredClone(save),
  origin_platform:webOnly?'web':'android',installation_uuid:webOnly?null:'install'}:null;
 let writes=0;
 const receipts=new Map();
 const admin={async rpc(name,args){
   if(name==='pup_event_settings_public')return {data:eventSettings,error:null};
  // Mirror the existing server-owned PupEye RPC contract in isolated gameplay
  // tests. A clean fair-play status must not increment gameplay write counts.
  if(name==='pupeye_web_fairplay_status'||name==='pupeye_web_fairplay_record'){
   if(args?.p_account_uuid!==account.id)throw Error('Wrong PupEye account');
   return {data:{status:'clear',restrictedUntil:null,message:null},error:null};
  }
  if(name==='pup_web_gameplay_receipt'){
   const old=receipts.get(args.p_operation_id);
   return {data:old?old.hash===args.p_intent_hash?{status:'saved',revision:old.revision}:{status:'reused_id'}:{status:'unknown'},error:null};
  }
  if(name==='pup_rarity_reward_snapshot')return {data:{version:1,rows:['classic','golden','poodle','spotty','test_v1_crash_dummy','test_v2_crash_dummy','cloud','midnight'].map(puppy_id=>({puppy_id,rarity:'common',published:true,acquisition:'standard'}))},error:null};
  if(name==='pup_web_gameplay_commit'||name==='pup_rarity_reward_commit'){
   const old=receipts.get(args.p_operation_id);
   if(old)return {data:old.hash===args.p_intent_hash?{status:'duplicate',revision:old.revision}:{status:'reused_id'},error:null};
   if(race||!row||row.revision!==args.p_expected_revision)return {data:{status:'conflict'},error:null};
   row={...row,revision:row.revision+1,save_data:structuredClone(args.p_save_data)};
   writes++;
   receipts.set(args.p_operation_id,{hash:args.p_intent_hash,revision:row.revision});
   return {data:{status:'saved',revision:row.revision},error:null};
  }
  throw Error('Unexpected RPC '+name);
 },from(table){
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
