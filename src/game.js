// Ported from pup-clinker/Web and Android's GameViewModel: web-specific schema v1.
export const SOURCE = 'https://raw.githubusercontent.com/markhitchk/pup-clinker/main/assets';
export const logo = SOURCE + '/logos/puppy_clicker.png';
const v1 = [
  ['classic','Buddy / Classic'],['golden','Sunny'],['poodle','Mochi'],['spotty','Pepper'],
  ['midnight','Midnight'],['cloud','Cloud'],['aurora','Aurora'],['cocoa','Cocoa'],
  ['snowball','Snowball'],['galaxy','Galaxy'],['neon_buddy','Neon Buddy'],
  ['golden_night','Golden Night'],['halloween','Pumpkin Pup'],['santa','Santa Paws'],
  ['birthday','Birthday Buddy'],['dev_pup','Dev Pup'],['secret_snoot','Secret Snoot'],
  ['classic_forever','Classic Forever']
];
const v2 = [
  ['v2_frost','Frost'],['v2_honey','Honey'],['v2_biscuit','Biscuit'],
  ['v2_onyx','Onyx'],['v2_domino','Domino'],['v2_chestnut','Chestnut'],
  ['v2_prism','Prism'],['v2_flurry','Flurry'],['v2_harleytg','HarleyTG Puppy'],
  ['v2_dev_pup','Dev Pup'],['v2_rory','Rory']
];
export const ROSTER = [...v1.map(([id,name],i)=>({id,name,number:i+1,image:SOURCE+'/v1/v1_'+id+'.png'})),
  ...v2.map(([id,name],i)=>({id,name,number:i+19,image:SOURCE+'/v2/'+id+'.png'}))];
export const UPGRADES = [
  {id:'better_treats',name:'Better Treats',emoji:'🦴',description:'+1 per tap',effect:'CLICK',amount:1,base:35},
  {id:'chew_toy',name:'Chew Toy',emoji:'🧸',description:'+1 per second',effect:'AUTO',amount:1,base:100},
  {id:'golden_bowl',name:'Golden Bowl',emoji:'🥣',description:'+5 per tap',effect:'CLICK',amount:5,base:750},
  {id:'playmate',name:'Playmate',emoji:'🐕',description:'+5 per second',effect:'AUTO',amount:5,base:1500},
  {id:'lucky_collar',name:'Lucky Collar',emoji:'🍀',description:'+3 per tap',effect:'CLICK',amount:3,base:75,rarity:'COMMON',tickets:2},
  {id:'training_whistle',name:'Training Whistle',emoji:'📯',description:'+5 per second',effect:'AUTO',amount:5,base:125,rarity:'UNCOMMON',tickets:2},
  {id:'puppy_power',name:'Puppy Power',emoji:'⚡',description:'+25 per tap',effect:'CLICK',amount:25,base:250,rarity:'RARE',tickets:2},
  {id:'dog_park_crew',name:'Dog Park Crew',emoji:'🌳',description:'+25 per second',effect:'AUTO',amount:25,base:350,rarity:'RARE',tickets:3},
  {id:'treat_factory',name:'Treat Factory',emoji:'🏭',description:'+100 per second',effect:'AUTO',amount:100,base:600,rarity:'EPIC',tickets:3},
  {id:'legendary_snacks',name:'Legendary Snacks',emoji:'✨',description:'+100 per tap',effect:'CLICK',amount:100,base:900,rarity:'LEGENDARY',tickets:2},
];
export const RARITIES = ['COMMON','UNCOMMON','RARE','EPIC','LEGENDARY'];
const limit=(n,min=0,max=Number.MAX_SAFE_INTEGER)=>Math.max(min,Math.min(max,Number.isFinite(+n)?Math.floor(+n):min));
export const freshGame=()=>({
  puppyName:'Buddy',puppyStyle:'classic',unlockedPuppies:['classic','golden','poodle','spotty'],
  favoritePuppies:[],treats:0,lifetimeTreats:0,clickPower:1,autoPerSecond:0,
  upgrades:Object.fromEntries(UPGRADES.map(u=>[u.id,0])),
  ticketInventory:Object.fromEntries(RARITIES.map(r=>[r,0])),
  totalTicketsFound:0,totalTaps:0,combo:0,bestCombo:0,lastTapMs:0,
  happiness:100,fullness:100,energy:100,cleanliness:100,bond:10,careActions:0,
  totalShopPurchases:0,lastActiveAt:Date.now()
});
export function sanitizeGame(input){
  const base=freshGame();
  if(!input || typeof input!=='object')return base;
  for(const key of Object.keys(base))if(Object.prototype.hasOwnProperty.call(input,key))base[key]=input[key];
  for(const key of ['treats','lifetimeTreats','clickPower','autoPerSecond','totalTicketsFound','totalTaps','combo','bestCombo','lastTapMs','careActions','totalShopPurchases','lastActiveAt']){
    base[key]=limit(base[key],key==='clickPower'?1:0);
  }
  for(const key of ['happiness','fullness','energy','cleanliness','bond'])base[key]=limit(base[key],0,100);
  const valid=new Set(ROSTER.map(p=>p.id));
  base.unlockedPuppies=[...new Set(Array.isArray(base.unlockedPuppies)?base.unlockedPuppies.filter(id=>valid.has(id)):['classic'])];
  if(!base.unlockedPuppies.includes('classic'))base.unlockedPuppies.unshift('classic');
  base.favoritePuppies=[...new Set(Array.isArray(base.favoritePuppies)?base.favoritePuppies.filter(id=>valid.has(id)):[])];
  if(!base.unlockedPuppies.includes(base.puppyStyle))base.puppyStyle='classic';
  base.puppyName=String(base.puppyName||'Buddy').slice(0,40);
  base.upgrades=Object.fromEntries(UPGRADES.map(u=>[u.id,limit(base.upgrades?.[u.id],0,1000)]));
  base.ticketInventory=Object.fromEntries(RARITIES.map(r=>[r,limit(base.ticketInventory?.[r])]));
  return base;
}
export const level=g=>1+Math.floor(Math.sqrt(g.lifetimeTreats/100));
export const wellness=g=>Math.round((g.happiness+g.fullness+g.energy+g.cleanliness)/4);
export const mood=g=>wellness(g)>=85?'Thrilled':wellness(g)>=65?'Happy':wellness(g)>=40?'Okay':'Needs care';
export const format=n=>new Intl.NumberFormat('en-US',{notation:Math.abs(n)>=10000?'compact':'standard',maximumFractionDigits:1}).format(Math.floor(n||0));
export const cost=(g,u)=>Math.max(1,Math.floor(u.base*(u.rarity?1.18:1.38)**(g.upgrades[u.id]||0)));
export const ticketCost=(g,u)=>u.rarity?(u.tickets+Math.min(2,Math.floor((g.upgrades[u.id]||0)/3))):0;
export function withGain(g,amount){
  const gain=limit(amount);
  g.treats=limit(g.treats+gain);
  g.lifetimeTreats=limit(g.lifetimeTreats+gain);
}
export function tap(g,now=Date.now()){
  withGain(g,g.clickPower);
  g.totalTaps++;
  g.combo=now-g.lastTapMs<=1100?g.combo+1:1;
  g.bestCombo=Math.max(g.bestCombo,g.combo);
  g.lastTapMs=now;
  if(Math.random()<0.01){
    const r=Math.random(),rarity=r<.58?'COMMON':r<.80?'UNCOMMON':r<.94?'RARE':r<.99?'EPIC':'LEGENDARY';
    g.ticketInventory[rarity]++;g.totalTicketsFound++;
    return rarity;
  }
  return null;
}
export function passive(g,seconds){
  if(g.autoPerSecond>0){
    const each=g.autoPerSecond+(wellness(g)>=85?Math.floor(g.autoPerSecond*.1):0);
    withGain(g,Math.min(14400,Math.max(0,Math.floor(seconds)))*each);
  }
  g.lastActiveAt=Date.now();
}
export function purchase(g,u){
  const price=cost(g,u),tickets=ticketCost(g,u);
  if(g.treats<price || (u.rarity && g.ticketInventory[u.rarity]<tickets))return false;
  g.treats-=price;if(u.rarity)g.ticketInventory[u.rarity]-=tickets;
  g.upgrades[u.id]++;
  if(u.effect==='CLICK')g.clickPower+=u.amount;else g.autoPerSecond+=u.amount;
  g.totalShopPurchases++;g.happiness=Math.min(100,g.happiness+2);
  return true;
}
export function care(g,type){
  if(type==='feed')g.fullness=Math.min(100,g.fullness+18);
  if(type==='play'){g.happiness=Math.min(100,g.happiness+16);g.energy=Math.max(0,g.energy-7);}
  if(type==='wash')g.cleanliness=Math.min(100,g.cleanliness+22);
  if(type==='rest')g.energy=Math.min(100,g.energy+24);
  g.bond=Math.min(100,g.bond+1);g.careActions++;
}
export function drawCard(){
  return 1+Math.floor(Math.random()*13);
}
export function handValue(cards){
  let aces=0,score=0;
  for(const card of cards){if(card===1){aces++;score+=11;}else score+=Math.min(card,10);}
  while(score>21 && aces){score-=10;aces--;}return score;
}
