/** Developer accounts can view public scores, but cannot opt in or be ranked. */
export function isLeaderboardActionAllowed({reason,method}){
 return reason===null||(reason==="developer"&&method==="GET");
}
/** Browsing public rankings does not imply consent to participate. */
export function leaderboardParticipation({reason,optedIn,excluded}){
 const canParticipate=reason===null&&excluded!==true;
 return {canParticipate,participating:canParticipate&&optedIn===true};
}
