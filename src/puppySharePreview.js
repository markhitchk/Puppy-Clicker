// Share-preview metadata uses the same published roster and legacy descriptions
// as the public puppy details page. No account or gameplay records are exposed.
import roster from "./data/roster.js";
import {LEGACY_V6_PUPPIES} from "./native/src/engine/rosterV6.js";
import {PUPPY_IMAGES} from "./native/src/assets/puppies.js";
import {matchPuppy,puppyAssetId,readPuppyQuery} from "./puppyLinks.js";
import {shareCardPath,SHARE_CARD_WIDTH,SHARE_CARD_HEIGHT} from "./puppyShareCard.js";

const SITE_URL="https://puppy-clicker.vercel.app";
const details=new Map(LEGACY_V6_PUPPIES.map(p=>[p.id,p]));
const published=new Map(roster.map(p=>[p.id,p]));
const publicPuppies=[...new Set([...published.keys(),...Object.keys(PUPPY_IMAGES)])].map(id=>{
 const puppy=published.get(id)||{id};
 const legacy=details.get(id);
 return {
  ...puppy,
  id,
  name:legacy?.name||puppy.name||id,
  description:legacy?.description||(
   puppy.group==="test"?"Development-only puppy used to verify game stability.":"A special Puppy Clicker companion."
  ),
  emoji:legacy?.emoji||"🐾",
  image:puppy.image||PUPPY_IMAGES[id]?.uri,
  group:puppy.group==="discord_rewards"?"discord":puppy.group||legacy?.group||"special",
  redeemOnly:legacy?.redeemOnly??puppy.redeemOnly??false
 };
}).filter(p=>Boolean(p.image));

function escapeHtml(value){
 return String(value).replace(/&/g,"&amp;").replace(/</g,"&lt;")
  .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}

export function getPuppySharePreview(search){
 const puppy=matchPuppy(publicPuppies,readPuppyQuery(search));
 if(!puppy)return null;
 const category=puppy.group==="v1"?"V1":puppy.group==="v2"?"V2":
  puppy.group==="discord"?"Community":puppy.group==="test"?"Test":"Special";
 // A transparent preview contains only the real puppy art and site logo.
 // Individual messaging clients choose how to display PNG transparency.
 const imagePath=shareCardPath(puppy);
 return {
  title:puppy.emoji+" "+puppy.name+" | Puppy Clicker",
  description:puppy.description+" Meet "+puppy.name+", a "+category+
   " puppy in Puppy Clicker."+(puppy.redeemOnly?" Special unlock.":""),
  image:SITE_URL+imagePath,
  imageAlt:puppy.name+" puppy artwork from Puppy Clicker",
  url:SITE_URL+"/puppies?pup="+encodeURIComponent(puppyAssetId(puppy)),
  name:puppy.name,
  id:puppy.id
 };
}

function replaceMeta(html,kind,key,value){
 const expression=new RegExp('<meta\\s+'+kind+'="'+key+'"\\s+content="[^"]*"\\s*\\/?>',"i");
 const tag='<meta '+kind+'="'+key+'" content="'+escapeHtml(value)+'" />';
 return expression.test(html)?html.replace(expression,tag):html.replace("</head>", "    "+tag+"\n  </head>");
}

export function applyPuppySharePreview(html,preview){
 if(!preview)return html;
 let output=html.replace(/<title>[^<]*<\/title>/i,"<title>"+escapeHtml(preview.title)+"</title>");
 const tags=[
  ["name","description",preview.description],
  ["property","og:title",preview.title],
  ["property","og:description",preview.description],
  ["property","og:url",preview.url],
  ["property","og:image",preview.image],
  ["property","og:image:secure_url",preview.image],
  ["property","og:image:type","image/png"],
  ["property","og:image:width",String(SHARE_CARD_WIDTH)],
  ["property","og:image:height",String(SHARE_CARD_HEIGHT)],
  ["property","og:image:alt",preview.imageAlt],
  ["name","twitter:card","summary_large_image"],
  ["name","twitter:title",preview.title],
  ["name","twitter:description",preview.description],
  ["name","twitter:image",preview.image],
  ["name","twitter:image:alt",preview.imageAlt]
 ];
 for(const [kind,key,value] of tags)output=replaceMeta(output,kind,key,value);
 const canonical='<link rel="canonical" href="'+escapeHtml(preview.url)+'" />';
 return output.replace("</head>","    "+canonical+"\n  </head>");
}
