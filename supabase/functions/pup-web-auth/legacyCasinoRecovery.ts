// Web-only recovery of an obsolete Kotlin Blackjack reservation. No client
// amount, deck, payout, timestamp or result participates in this operation.
type Dict=Record<string,any>;
const validId=(id:unknown):id is string=>typeof id==='string'&&/^[A-Za-z0-9_-]{8,80}$/.test(id);
const safe=(n:unknown):n is number=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0;
function inspect(values:Dict,now:number){
 try{
  if(values.beta_casino_round_v1)return null;
  const round=JSON.parse(values.casino_active_round_v1);
  const completed=JSON.parse(values.casino_completed_round_ids_v1||'[]');
  if(!Array.isArray(completed)||completed.length>256||completed.some(id=>!validId(id))||
   new Set(completed).size!==completed.length)return null;
  if(round?.schemaVersion!==1||round.game!=='BLACKJACK'||!validId(round.roundId)||
   completed.includes(round.roundId)||round.state!=='WAGER_ACCEPTED'||
   !safe(round.acceptedAtMs)||round.acceptedAtMs<=0||now-round.acceptedAtMs<86400000||
   !safe(round.wagerTreats)||round.wagerTreats<20||round.wagerTreats>600000||round.wagerTreats%10!==0||
   round.payoutTreats!==0||round.outcomeCommittedAtMs!==0||round.outcomePayload||
   typeof round.wagerPayload!=='string'||round.wagerPayload.length>4096)return null;
  const hand=JSON.parse(round.wagerPayload);
  if(hand?.schemaVersion!==1||hand.game!=='BLACKJACK'||hand.complete!==false||
   !Array.isArray(hand.hands)||hand.hands.length<1||hand.hands.length>3||
   !Number.isInteger(hand.activeHandIndex)||hand.activeHandIndex<0||hand.activeHandIndex>=hand.hands.length||
   !Array.isArray(hand.dealerCards)||hand.dealerCards.length!==2||!Array.isArray(hand.remainingDeck))return null;
  const cards=[...hand.remainingDeck,...hand.dealerCards];
  let wager=0;
  for(const h of hand.hands){
   if(!Array.isArray(h?.cards)||h.cards.length<2||!safe(h.wagerTreats)||h.wagerTreats<20||
    h.wagerTreats>200000||h.wagerTreats%10!==0||
    ['stood','doubled','fromSplit','splitAces'].some(k=>typeof h[k]!=='boolean'))return null;
   cards.push(...h.cards);wager+=h.wagerTreats;
  }
  if(wager!==round.wagerTreats||cards.length!==52||new Set(cards).size!==52||
   cards.some(c=>!Number.isInteger(c)||c<0||c>51))return null;
  const balance=values.casino_chips_v7;
  if(!safe(balance)||!Number.isSafeInteger(balance+wager))return null;
  return {round,completed,wager,balance};
 }catch{return null;}
}
export function legacyCasinoRefund(values:Dict,now=Date.now()):number|null{
 return inspect(values,now)?.wager??null;
}
export function recoverLegacyCasino(source:Dict,now=Date.now()):Dict{
 if(source?.format!=='puppy-clicker-cloud-save'||source.version!==1||!source.stores?.puppy_clicker_save?.values)
  throw Error('PUP_CASINO_RECOVERY_UNAVAILABLE');
 const main=source.stores.puppy_clicker_save;
 const checked=inspect(main.values,now);
 if(!checked)throw Error('PUP_CASINO_RECOVERY_UNAVAILABLE');
 const {round,completed,wager,balance}=checked;
 const values={...main.values},types={...main.types};
 // Same refund and completed-ID semantics as PuppyCasinoTransactionEngine.refund.
 values.casino_chips_v7=balance+wager;types.casino_chips_v7='long';
 values.casino_completed_round_ids_v1=JSON.stringify([...completed,round.roundId].slice(-256));
 types.casino_completed_round_ids_v1='string';
 values.beta_legacy_casino_recovery_v1=JSON.stringify({roundId:round.roundId,refund:wager,recoveredAt:now});
 types.beta_legacy_casino_recovery_v1='string';
 delete values.casino_active_round_v1;delete types.casino_active_round_v1;
 return {...source,savedAtEpochMs:now,stores:{...source.stores,puppy_clicker_save:{...main,values,types}}};
}
