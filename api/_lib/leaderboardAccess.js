/** Eligible Pup Accounts, including developers, can view rankings and explicitly opt in. */
export function isLeaderboardActionAllowed({reason,method}){
 return (reason===null||reason==="developer")&&["GET","POST"].includes(method);
}
/** Mere access does not imply consent to publish a score. */
export function leaderboardParticipation({reason,optedIn,excluded}){
 const canParticipate=(reason===null||reason==="developer")&&excluded!==true;
 return {canParticipate,participating:canParticipate&&optedIn===true};
}
/** Applies after selection of consented and not-excluded leaderboard entries. */
export function isRankedAccountEligible(account,player,excludedPlayers){
 return account.status==="active"&&player?.status==="active"&&!excludedPlayers.has(account.player_uuid);
}
