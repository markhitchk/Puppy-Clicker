// Server-side account evidence is not proof of the original registration method.
const isProvider=value=>value==="password"||value==="discord";
export function resolveRegistrationMethod({storedMethod,auditMethod,hasPassword,discordUserId}={}){
 const registrationMethod=isProvider(storedMethod)?storedMethod:isProvider(auditMethod)?auditMethod:null;
 const detectedAuthMethods=[];
 if(hasPassword===true)detectedAuthMethods.push("password");
 if(typeof discordUserId==="string"&&/^\d{15,22}$/.test(discordUserId))detectedAuthMethods.push("discord");
 return {registrationMethod,detectedAuthMethods};
}
