// Fail closed on explicit attempts to submit server-owned gameplay state.
 // This is a request-integrity check, not an automated determination of cheating.
 const forbidden=new Set(['savedata','savejson','save','stores','values','types','treats','lifetimetreats','xp','playerxp','playerxpv1','totaltaps','legitimatetaps','legitimatetapsv7','inventory','balance','balances','reward','payout','rng','random','randomseed','seed','timestamp','savedatepochms','accountuuid','playeruuid','installationuuid','role','guildrole','riskscore','restricteduntil','serverreceipt']);
 const normalize=key=>key.replace(/[^a-z0-9]/gi,'').toLowerCase();
 export function hasServerOwnedFields(intent){
  if(!intent||typeof intent!=='object'||Array.isArray(intent))return false;
  const keys=Object.keys(intent);
  if(keys.some(key=>forbidden.has(normalize(key))))return true;
  // The only legitimate nested client object is a casino bet. Reject
  // server-owned fields here too; unknown values never reach the engine.
  const bet=intent.bet;
  return !!bet&&typeof bet==='object'&&Object.keys(bet).some(key=>forbidden.has(normalize(key)));
 }
