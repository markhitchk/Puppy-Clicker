// WebAuthn passkeys are verified by Supabase Auth, never by Puppy Clicker's browser UI.
// Production RP ID must be configured as puppy-clicker.vercel.app in Supabase Auth.
// Use the production hostname only, to avoid enrolling unusable credentials on previews.
export const PASSKEY_ORIGIN = "https://puppy-clicker.vercel.app";

export function passkeyAvailability({
 client,
 origin=globalThis.location?.origin,
 secure=globalThis.isSecureContext,
 publicKeyCredential=globalThis.PublicKeyCredential
}={}){
 if(origin!==PASSKEY_ORIGIN)return {available:false,reason:"Passkeys are available only on the official Puppy Clicker website."};
 if(secure!==true||typeof publicKeyCredential!=="function")return {available:false,reason:"This browser does not support secure passkey authentication."};
 if(typeof client?.auth?.signInWithPasskey!=="function"||
    typeof client?.auth?.registerPasskey!=="function"||
    !client?.auth?.passkey)return {available:false,reason:"Passkey authentication is unavailable. Password and Discord sign-in still work."};
 return {available:true,reason:""};
}

// Never display raw tokens or verbose provider errors in the login UI.
export function passkeyErrorMessage(error){
 const code=String(error?.code||error?.name||error?.message||"");
 switch(code){
  case "passkey_disabled": return "Passkeys are not enabled on the account server yet. Use your password or Discord to sign in.";
  case "webauthn_challenge_expired": return "The passkey prompt expired. Try again.";
  case "webauthn_credential_exists": return "That passkey is already registered to this account.";
  case "too_many_passkeys": return "Your account has reached its passkey limit.";
  case "webauthn_credential_not_found": return "This passkey is not registered. Try another passkey or sign in with your password.";
  case "NotAllowedError":
  case "ERROR_CEREMONY_ABORTED": return "Passkey verification was cancelled or timed out. You can try again.";
  case "PUP_PASSKEY_ACCOUNT_VERIFICATION_FAILED":return "The passkey signed in, but Pup Account verification failed. Sign in with another method and contact support if this continues.";
  default:return "Passkey authentication could not complete. Try again or use your password or Discord.";
 }
}

export async function signInWithPupPasskey(client,verifyAccount){
 if(typeof client?.auth?.signInWithPasskey!=="function")throw Error("passkey_disabled");
 const {data,error}=await client.auth.signInWithPasskey();
 if(error)throw error;
 if(!data?.user||!data?.session)throw Error("PUP_PASSKEY_SIGNIN_FAILED");
 // Supabase Auth hosts multiple account types. A valid Supabase session alone
 // MUST NOT bypass Puppy Clicker's verified Pup Account / PupEye link.
 try{
  const account=await verifyAccount(client);
  if(!account?.id)throw Error("PUP_ACCOUNT_NOT_LINKED");
  return {user:data.user,account};
 }catch{
  // Do not leave an unrelated Auth session active on this game's origin.
  try{await client.auth.signOut();}catch{}
  throw Error("PUP_PASSKEY_ACCOUNT_VERIFICATION_FAILED");
 }
}
