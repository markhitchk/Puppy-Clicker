// Shared, dependency-free language catalogue for React Native and React Native Web.
export const LANGUAGE_KEY="puppy-clicker:language:v1";
export const LANGUAGE_CHANGED="puppy-clicker:language-changed";
export const SUPPORTED_LANGUAGES=Object.freeze(["en","es"]);
export const STRINGS=Object.freeze({
 en:Object.freeze({
  language:"Language",home:"Home",play:"Play",puppies:"Puppies",policies:"Policies",
  title:"Puppy Clicker",heroLabel:"PUPPY CLICKER · WEB EDITION",heroLine1:"Tap. Care. Collect.",
  heroLine2:"Grow your puppy world.",heroIntro:"Meet adorable puppies, earn Treats by tapping, grow your collection, take care of your companions, and unlock new rewards. Play in your browser with your Pup Account.",
  heroPlay:"Play Puppy Clicker",heroAccount:"Manage Pup Account",heroDemo:"Try Demo",
  heroNote:"Already play on Android? Use your existing Pup Account to access your linked cloud progression.",
  legalTitle:"Policies & terms",legalIntro:"Read official Puppy Clicker documents in a clean, accessible view.",
  privacy:"Privacy Policy",terms:"Terms of Use",websitePrivacy:"Website activity notice",
  contents:"Contents",documentLanguage:"Document language: English. This is the original published text.",
  viewSource:"View original Markdown source",print:"Print document",
  loading:"Loading…",retry:"Retry",goBack:"Return home",
  rewards:"Rewards",overview:"Overview",dailyRewards:"Daily rewards",todaysGoals:"Today’s goals",
  adventures:"Adventures & games",progression:"Progression",achievements:"Achievements",
  claimedToday:"Claimed today",completedAchievements:"Completed achievements",
  open:"Open",claim:"Claim",claimed:"Claimed",signIn:"Sign in",settings:"Settings",
  leaderboard:"Leaderboard",chat:"Community chat",selectLanguage:"Choose language"
 }),
 es:Object.freeze({
  language:"Idioma",home:"Inicio",play:"Jugar",puppies:"Cachorros",policies:"Políticas",
  title:"Puppy Clicker",heroLabel:"PUPPY CLICKER · VERSIÓN WEB",heroLine1:"Toca. Cuida. Colecciona.",
  heroLine2:"Haz crecer tu mundo de cachorros.",heroIntro:"Conoce cachorros adorables, gana golosinas tocando, amplía tu colección, cuida a tus compañeros y desbloquea nuevas recompensas. Juega en tu navegador con tu Pup Account.",
  heroPlay:"Jugar Puppy Clicker",heroAccount:"Administrar Pup Account",heroDemo:"Probar demo",
  heroNote:"¿Ya juegas en Android? Usa tu Pup Account para acceder al progreso vinculado en la nube.",
  legalTitle:"Políticas y condiciones",legalIntro:"Lee los documentos oficiales de Puppy Clicker de forma clara y accesible.",
  privacy:"Política de privacidad",terms:"Términos de uso",websitePrivacy:"Aviso de actividad del sitio web",
  contents:"Contenido",documentLanguage:"Idioma del documento: inglés. Este es el texto original publicado.",
  viewSource:"Ver archivo Markdown original",print:"Imprimir documento",
  loading:"Cargando…",retry:"Reintentar",goBack:"Volver al inicio",
  rewards:"Recompensas",overview:"Resumen",dailyRewards:"Recompensas diarias",todaysGoals:"Metas de hoy",
  adventures:"Aventuras y juegos",progression:"Progresión",achievements:"Logros",
  claimedToday:"Reclamado hoy",completedAchievements:"Logros completados",
  open:"Abrir",claim:"Reclamar",claimed:"Reclamado",signIn:"Iniciar sesión",settings:"Ajustes",
  leaderboard:"Clasificación",chat:"Chat de la comunidad",selectLanguage:"Elegir idioma"
 })
});
export function normalizeLanguage(value){
 const code=String(value||"").trim().toLowerCase().split(/[-_]/)[0];
 return SUPPORTED_LANGUAGES.includes(code)?code:"en";
}
export function readLanguage(storage,deviceLanguage){
 try{
  const saved=(storage??globalThis.localStorage)?.getItem(LANGUAGE_KEY);
  if(saved&&SUPPORTED_LANGUAGES.includes(saved))return saved;
 }catch{}
 return normalizeLanguage(deviceLanguage??globalThis.navigator?.language);
}
export function writeLanguage(next,storage){
 const code=normalizeLanguage(next);
 try{(storage??globalThis.localStorage)?.setItem(LANGUAGE_KEY,code);}catch{}
 if(typeof window!=="undefined"){
  document.documentElement.lang=code;
  window.dispatchEvent(new CustomEvent(LANGUAGE_CHANGED,{detail:{language:code}}));
 }
 return code;
}
export function t(language,key,values={}){
 let template=STRINGS[normalizeLanguage(language)][key]??STRINGS.en[key]??key;
 for(const [name,value] of Object.entries(values))template=template.split("{"+name+"}").join(String(value));
 return template;
}
export function missingKeys(){
 const reference=Object.keys(STRINGS.en);
 return SUPPORTED_LANGUAGES.flatMap(language=>reference.filter(key=>!(key in STRINGS[language])).map(key=>language+":"+key));
}
