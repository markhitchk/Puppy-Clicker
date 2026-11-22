export function crossplayDb(save, {owner=true, race=false, webOnly=false,eventSettings={all_events:true,christmas_2026:true,winter_effects:true}}={}) {
 const account={id:'account',player_uuid:'player',
  active_installation_uuid:webOnly?null:'install',origin_platform:webOnly?'web':'android'};
 let row=save?{player_uuid:'player',account_uuid:'account',revision:1,save_data:structuredClone(save),
  origin_platform:webOnly?'web':'android',installation_uuid:webOnly?null:'install'}:null;
 let writes=0;
 const receipts=new Map();
 const gifts=new Map();
 const admin={async rpc(name,args){
   if(name==='pupeye_web_strict_integrity'||name==='pupeye_web_strict_scan')return {data:null,error:null};
   if(name==='pup_advent_queue'){
    const day=args.p_day,now=Date.now(),v=row.save_data.stores.puppy_clicker_save.values,t=row.save_data.stores.puppy_clicker_save.types;
    if(gifts.has(day)||(v.web_advent_2026_claimed_v1||[]).includes(day))return {data:{status:'duplicate'},error:null};
    if(now<Date.UTC(2026,11,1)||now>=Date.UTC(2026,11,26))return {data:{status:'ADVENT_CLOSED'},error:null};
    if(now<Date.parse(day+'T00:00:00Z'))return {data:{status:'ADVENT_DAY_LOCKED'},error:null};
    if(race||row.revision!==args.p_revision)return {data:{status:'CLOUD_SAVE_CONFLICT'},error:null};
    gifts.set(day,{id:'aaaaaaaa-aaaa-4aaa-8aaa-'+day.slice(-2).padStart(12,'0'),claimed:false});
    v.web_advent_2026_claimed_v1=[...(v.web_advent_2026_claimed_v1||[]),day];t.web_advent_2026_claimed_v1='string_set';
    row.revision++;writes++;
    return {data:{status:'saved'},error:null};
   }
   if(name==='pup_reward_redeem'){
    const gift=[...gifts.values()].find(g=>g.id===args.p_id);
    if(!gift||args.p_account!==account.id)return {data:{status:'REWARD_NOT_FOUND'},error:null};
    if(gift.claimed)return {data:{status:'duplicate',label:'500 Treats'},error:null};
    if(race||row.revision!==args.p_revision)return {data:{status:'CLOUD_SAVE_CONFLICT'},error:null};
    gift.claimed=true;const v=row.save_data.stores.puppy_clicker_save.values;
    v.treats+=500;v.lifetime_treats+=500;row.revision++;writes++;
    return {data:{status:'saved',label:'500 Treats'},error:null};
   }
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
 return {admin,account,row:()=>structuredClone(row),writes:()=>writes,gifts:()=>structuredClone([...gifts.values()])};
}
