import {normalizePupFriendCode,isValidPupFriendCode} from './native/src/components/pupFriendCode.js';
export function readInviteCode(search=globalThis.location?.search||''){
 const code=normalizePupFriendCode(new URLSearchParams(search).get('invite'));
 return isValidPupFriendCode(code)?code:null;
}
export function friendInviteUrl(code){
 const value=normalizePupFriendCode(code);if(!isValidPupFriendCode(value))return '';
 const url=new URL('/account','https://puppy-clicker.vercel.app');
 url.searchParams.set('mode','register');url.searchParams.set('invite',value);return url.toString();
}
