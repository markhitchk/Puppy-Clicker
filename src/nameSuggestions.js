// Safe, client-side suggestions. Nothing is written to a Pup Account or
// cloud puppy save until the player explicitly submits the relevant form.
const adjectives=['Sunny','Cozy','Merry','Lucky','Cloudy','Sparkly','Gentle','Golden','Bouncy','Clever','Happy','Tiny','Dreamy','Fuzzy','Bright','Starry','Sweet','Cheery','Jolly','Peppy','Velvet','Moonlit'];
const handles=['Paw','Pup','Snoot','Tail','Biscuit','Buddy','Mochi','Paws','Corgi','Scout','Poodle','Wag','Noodle','Fluff','Zoomie','Waffle'];
const puppies=['Mochi','Biscuit','Waffles','Pebbles','Noodle','Pippin','Pickles','Maple','Clover','Luna','Teddy','Poppy','Cocoa','Dumpling','Muffin','Sparky','Pumpkin','Boba','Toffee','Miso','Nugget','Bean','Sprout','Marshmallow','Pancake','Daisy','Cinnamon','Tater','Snickers','Cookie','Oreo','Mango','Pixel','Comet','Bubbles','Buttons'];
const passwordAlphabet='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*_-?';
const passwordGroups=['ABCDEFGHJKLMNPQRSTUVWXYZ','abcdefghijkmnopqrstuvwxyz','23456789','!@#$%*_-?'];
function secureRandom(max,source=globalThis.crypto){
 if(!Number.isSafeInteger(max)||max<1||max>0xffffffff)throw Error('INVALID_RANDOM_RANGE');
 if(!source||typeof source.getRandomValues!=='function')
  throw Error('SECURE_RANDOM_UNAVAILABLE');
 // Rejection sampling avoids skew when choosing characters.
 const range=0x100000000;
 const limit=range-range%max;
 let value;
 do{const buffer=new Uint32Array(1);source.getRandomValues(buffer);value=buffer[0];}while(value>=limit);
 return value%max;
}
function pick(values,source){return values[secureRandom(values.length,source)];}
function different(previous,create,fallback){
 const current=String(previous||'').trim().toLowerCase();
 for(let i=0;i<5;i++){
  const suggestion=create();
  if(suggestion.toLowerCase()!==current)return suggestion;
 }
 return fallback(current);
}
export function suggestUsername(previous='',source=globalThis.crypto){
 return different(previous,()=>pick(adjectives,source)+pick(handles,source)+'_'+
  String(1000+secureRandom(9000,source)),current=>
  'Pup'+String(100000+secureRandom(900000,source)));
}
export function suggestPuppyName(previous='',source=globalThis.crypto){
 return different(previous,()=>pick(puppies,source),current=>
  puppies.find(name=>name.toLowerCase()!==current)||'Buddy');
}
export function suggestDisplayName(previous='',source=globalThis.crypto){
 return different(previous,()=>pick(adjectives,source)+' '+pick(handles,source),current=>
  'Puppy '+(current==='puppy fan'?'Explorer':'Fan'));
}
export function generateStrongPassword(source=globalThis.crypto){
 const chars=passwordGroups.map(group=>pick(group,source));
 while(chars.length<24)chars.push(pick(passwordAlphabet,source));
 for(let i=chars.length-1;i>0;i--){
  const j=secureRandom(i+1,source);
  [chars[i],chars[j]]=[chars[j],chars[i]];
 }
 return chars.join('');
}
