// PupEye Chat Screening v2: unflagged messages may publish automatically.
// Staff can still remove and review messages; text screening is not infallible.
export const SCREENING_VERSION=2;
const rules=[
 ["PROFANITY",/\b(?:fuck|fucking|shit|bitch|asshole|mierda|puta|pendej[oa]|cabron|chingad[oa])\b/iu],
 ["SEXUAL",/\b(?:sex|sexual|nudes?|naked|porn(?:ography)?|sexting|sexo|sexual(?:es)?|desnud[oa]s?|pornografia|intim[oa]s?)\b/iu],
 ["SOLICITATION",/\b(?:send (?:me )?(?:photos?|pics?|nudes?)|show (?:me )?your body|meet (?:me )?alone|keep (?:it|this) secret|private (?:chat|pics?)|manda (?:me )?fotos|envia (?:me )?fotos|no (?:le )?digas a tus padres)\b/iu],
 ["HARASSMENT",/\b(?:idiot|moron|stupid|imbecil|estupido|idiota)\b/iu],
 ["THREAT",/\b(?:kill yourself|i (?:will|am going to) kill|you should die|te voy a matar|voy a matarte|suicidate|matate)\b/iu],
 ["HATE",/\b(?:white supremacy|racial purity|supremacia blanca|odio racial)\b/iu],
 ["SCAM",/\b(?:free gift ?cards?|send money|give me your password|contrasena|passcode|codigo de acceso)\b/iu],
 ["CONTACT",/\b(?:discord\.gg|https?:\/\/|www\.|\w+@\w+\.[a-z]{2,}|@(?:gmail|hotmail|outlook)\b)\b/iu],
 ["PHONE",/(?:\+?\d[\s().-]?){10,15}/u],
 ["SPAM",/(.)\1{10,}/iu],
 // Keep off-platform handles, platforms and deliberately split wording in staff review.
 ["CONTACT",/@[\p{L}\p{N}_.-]{2,}|\b(?:discord|instagram|snapchat|telegram|whatsapp|tiktok)\b|(?:\b[a-z0-9]\.){3,}[a-z0-9]/iu],
 ["NEEDS_CONTEXT",/\b(?:f[.\s*_\-]+u[.\s*_\-]+c[.\s*_\-]+k|s[.\s*_\-]+e[.\s*_\-]+x)\b/iu],
 ["NEEDS_CONTEXT",/[\u200b-\u200f\u2060\ufeff]/u]
];
export function normalizedChatBody(text){
 if(typeof text!=="string"||!text.trim())throw Error("CHAT_EMPTY_MESSAGE");
 const trimmed=text.trim();
 if(Array.from(trimmed).length>300||new TextEncoder().encode(trimmed).length>1200)
  throw Error("CHAT_MESSAGE_TOO_LONG");
 if(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(trimmed))
  throw Error("CHAT_INVALID_CHARACTERS");
 return trimmed;
}
export function screenPupEyeChat(body){
 const text=normalizedChatBody(body);
 const normalized=text.normalize("NFKC").toLowerCase()
   .replace(/[\u0300-\u036f]/gu,"")
   .normalize("NFD").replace(/[\u0300-\u036f]/gu,"").normalize("NFC")
   .replace(/[\u200b-\u200f\u2060\ufeff]/gu,"").replace(/\s+/gu," ");
 const codes=rules.filter(([,pattern])=>pattern.test(normalized)).map(([code])=>code);
 if(/[a-z]{30,}/iu.test(normalized))codes.push("NEEDS_CONTEXT");
 return {body:text,screeningVersion:SCREENING_VERSION,
  screeningCodes:[...new Set(codes)],
  state:codes.length?"pending":"published",automaticPublication:codes.length===0};
}
