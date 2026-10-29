import {createHash} from "node:crypto";
import {applyBetaLiveGameplay} from "../_shared/beta-live-gameplay.ts";
import {applyBetaEconomy} from "../_shared/beta-economy.ts";
import {applyBetaBlackjack} from "../_shared/beta-blackjack.ts";

// Web and native players share ONE authoritative pup_account_saves row.
// No browser-generated Kotlin saves, arbitrary balances, or client RNG.
export class CrossPlayError extends Error {
 constructor(status: number, code: string){super(code);this.status=status;this.code=code;}
 status:number;code:string;
}
type Dict=Record<string,any>;
const allowed=new Set([
 "tap","care","purchase","ticket","accessory","equip","exchange","skill",
 "daily","claimDailyGoal","parkStart","parkClaim","prestige",
 "slotsStart","slotsReveal","rouletteStart","rouletteReveal",
 "plinkoStart","plinkoReveal","scratchStart","scratchReveal",
 "wheelStart","wheelReveal","gacha","switch","rename","favorite",
 "afkStart","afkSettle","afkClaim","afkOpen","afkMarkAllRead","afkClearRead",
 "blackjackStart","blackjackHit","blackjackStand","blackjackDouble","blackjackSplit"
]);
const reject=(status:number,code:string):never=>{throw new CrossPlayError(status,code);};
const canonicalJson=(v:any):string=>v===null||v===undefined?"null":
 Array.isArray(v)?"["+v.map(canonicalJson).join(",")+"]":
 typeof v==="object"?"{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canonicalJson(v[k])).join(",")+"}":JSON.stringify(v);
const sha256Hex=(v:string)=>createHash("sha256").update(v).digest("hex");
const isObj=(v:any)=>v!==null&&typeof v==="object"&&!Array.isArray(v);
export function publicCloudSnapshot(save:Dict|null){
 if(!save)return {exists:false,revision:0,updatedAt:null,saveJson:null};
 const source=save.save_data,main=source?.stores?.puppy_clicker_save;
 if(source?.format!=="puppy-clicker-cloud-save"||source.version!==1||!isObj(main?.values))
  reject(409,"CLOUD_SAVE_UNSUPPORTED");
 // Do not deliver device attestations or private save identity to the browser.
 const values=Object.fromEntries(Object.entries(main.values).filter(([k])=>
  k!=="casino_active_round_v1"&&
  !/^(pup_eye_strikes|pupeye_|private_|device_|secret_|auth_|discord_token)/i.test(k)));
 return {exists:true,revision:Number(save.revision),updatedAt:save.updated_at,
  saveJson:JSON.stringify({format:source.format,version:1,
   webCompanion:{nativeCasinoPending:!!main.values.casino_active_round_v1},
   stores:{puppy_clicker_save:{values,types:main.types||{}}}})};
}
async function authoritativeSave(admin:any,account:Dict){
 // Browser doesn't become an Android device or bypass its PupEye standing.
 const {data:owner,error:oe}=await admin.from("pupeye_installations")
  .select("id,player_uuid,active,revoked_at")
  .eq("id",account.active_installation_uuid).maybeSingle();
 if(oe)reject(503,"PUP_ENFORCEMENT_UNAVAILABLE");
 if(!owner||owner.player_uuid!==account.player_uuid||owner.active!==true||owner.revoked_at)
  reject(403,"PUP_OWNER_DEVICE_UNAVAILABLE");
 const {data:save,error}=await admin.from("pup_account_saves")
  .select("player_uuid,account_uuid,revision,generation,installation_uuid,save_schema,save_data,updated_at")
  .eq("player_uuid",account.player_uuid).maybeSingle();
 if(error)reject(503,"PUP_CLOUD_UNAVAILABLE");
 if(save&&save.account_uuid!==account.id)reject(409,"CLOUD_SAVE_OWNER_MISMATCH");
 return save;
}
function validatedIntent(raw:any){
 if(!isObj(raw)||typeof raw.type!=="string"||!allowed.has(raw.type))
  reject(400,"PUP_GAMEPLAY_ACTION_INVALID");
 // Intent-only field whitelist: values, inventory, costs, payout, RNG,
 // timestamp and whole save data can never be supplied by the browser.
 return {
  type:raw.type,
  payment:typeof raw.payment==="string"?raw.payment:undefined,
  id:typeof raw.id==="string"?raw.id:undefined,
  kind:typeof raw.kind==="string"?raw.kind:undefined,
  upgradeId:typeof raw.upgradeId==="string"?raw.upgradeId:undefined,
  rarity:typeof raw.rarity==="string"?raw.rarity:undefined,
  name:typeof raw.name==="string"?raw.name:undefined,
  skill:typeof raw.skill==="string"?raw.skill:undefined,
  goalId:typeof raw.goalId==="string"?raw.goalId:undefined,
  amount:typeof raw.amount==="number"?raw.amount:undefined,
  wager:typeof raw.wager==="number"?raw.wager:undefined,
  bet:isObj(raw.bet)?{
   type:typeof raw.bet.type==="string"?raw.bet.type:undefined,
   number:typeof raw.bet.number==="number"?raw.bet.number:undefined
  }:undefined
 };
}
export async function crossPlay(admin:any,account:Dict,body:Dict){
 if(body.action==="account-update"){
  const name=body.displayName;
  if(typeof name!=="string"||name.trim().length<2||name.trim().length>24||
   !/^[\p{L}\p{N} ._'’-]+$/u.test(name.trim()))reject(400,"PUP_DISPLAY_NAME_INVALID");
  const {data,error}=await admin.from("pup_accounts")
   .update({display_name:name.trim(),updated_at:new Date().toISOString()})
   .eq("id",account.id).eq("status","active").select("display_name").single();
  if(error)reject(503,"PUP_ACCOUNT_UPDATE_FAILED");
  return {updated:true,displayName:data.display_name};
 }
 const current=await authoritativeSave(admin,account);
 if(body.action==="cloud-save-read")return {
  verified:true,account:{id:account.id,username:account.username,
   displayName:account.display_name||account.username},
  cloud:publicCloudSnapshot(current)
 };
 if(body.action!=="gameplay")reject(400,"PUP_ACTION_INVALID");
 if(!current)reject(409,"CLOUD_SAVE_REQUIRED");
 if(!Number.isSafeInteger(body.expectedRevision)||body.expectedRevision<1)
  reject(400,"CLOUD_REVISION_REQUIRED");
 if(Number(current.revision)!==body.expectedRevision)reject(409,"CLOUD_SAVE_CONFLICT");
 const intent=validatedIntent(body.intent);
 if(/^(slots|roulette|plinko|scratch|wheel|blackjack)/.test(intent.type)&&
    current.save_data?.stores?.puppy_clicker_save?.values?.casino_active_round_v1)
  reject(409,"PUP_CASINO_ANDROID_ROUND_PENDING");
 let next;
 try{
  next=intent.type==="tap"||intent.type==="care"
   ?applyBetaLiveGameplay(current.save_data,intent)
   :intent.type.startsWith("blackjack")
    ?await applyBetaBlackjack(current.save_data,intent)
    :await applyBetaEconomy(current.save_data,intent);
 }catch(e){
  const code=String((e as Error)?.message||"");
  if(code==="PUP_TAP_RATE_LIMIT")
   reject(429,"PUP_TAP_RATE_LIMIT");
  // Only known, non-sensitive rule failures may reach the UI.
  if(new Set(["GACHA_INSUFFICIENT_TREATS","GACHA_INSUFFICIENT_TICKET",
   "NOT_ENOUGH_CASINO_CHIPS","BLACKJACK_INSUFFICIENT_CHIPS",
   "CASINO_ROUND_ALREADY_ACTIVE","CASINO_ROUND_NOT_FOUND","BLACKJACK_ROUND_NOT_FOUND",
   "INVALID_WAGER","BLACKJACK_INVALID_WAGER","BLACKJACK_CANNOT_DOUBLE",
   "BLACKJACK_CANNOT_SPLIT","BLACKJACK_MOVE_UNAVAILABLE"]).has(code))
   reject(409,code);
  reject(409,"PUP_GAMEPLAY_REJECTED");
 }
 const savedAt=new Date().toISOString();
 const {data:written,error}=await admin.from("pup_account_saves")
  .update({revision:body.expectedRevision+1,save_data:next,
   payload_hash_sha256:sha256Hex(canonicalJson(next)),updated_at:savedAt})
  .eq("player_uuid",account.player_uuid).eq("account_uuid",account.id)
  .eq("revision",body.expectedRevision)
  .select("revision,save_data,updated_at").maybeSingle();
 if(error)reject(503,"PUP_CLOUD_WRITE_UNAVAILABLE");
 if(!written)reject(409,"CLOUD_SAVE_CONFLICT");
 // Never roll back a successful save because an optional audit failed.
 if(intent.type!=="tap"||Number(written.revision)%100===0){
  try{await admin.from("pupeye_events").insert({
   player_uuid:account.player_uuid,installation_uuid:account.active_installation_uuid,
   event_code:"WEB_CROSSPLAY_GAMEPLAY",severity:"info",
   detail:{action:intent.type,revision:Number(written.revision)}
  });}catch{console.error("Cross-play audit unavailable after commit");}
 }
 return {saved:true,cloud:publicCloudSnapshot(written)};
}
