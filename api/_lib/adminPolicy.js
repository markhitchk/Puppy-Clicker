import {isIP} from "node:net";

export const STAFF_ROLES = new Set(["ADMIN","DEVELOPER"]);
export const ROLES = new Set(["GUEST","PUP_MEMBER","ADMIN","DEVELOPER"]);
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class AdminError extends Error {
  constructor(status, code) { super(code); this.status=status; this.code=code; }
}
export function isStaff(role) { return STAFF_ROLES.has(role); }
export function filterRegisteredAccountDirectory(accounts, players, query, limit=100) {
  const byPlayer=new Map(players.map(p=>[p.id,p]));
  const q=safeSearch(query);
  return accounts.filter(a=>{
    const p=byPlayer.get(a.player_uuid);
    return p && (!q || [a.username,a.display_name,p.username,p.player_id,p.friend_code]
      .some(v=>typeof v==="string" && v.toLowerCase().includes(q)));
  }).slice(0,limit);
}
// A display name of "localplayer" is not proof that an account is unregistered.
// Only the authoritative pup_accounts.player_uuid association establishes this.
export function classifyPlayerProfile(playerId, linkedAccountByPlayer) {
  return linkedAccountByPlayer.has(playerId) ? "registered" : "local";
}
export function canModifyRole(actorRole, nextRole, actorId, targetId) {
  return actorRole === "DEVELOPER" &&
    actorId !== targetId && ROLES.has(nextRole);
}
export function canSanction(actorRole, targetRole, actorId, targetId) {
  return isStaff(actorRole) && actorId !== targetId &&
    (actorRole === "DEVELOPER" || !isStaff(targetRole));
}
export function validateBanInput(value) {
  const reason = typeof value?.reason === "string" ? value.reason.trim() : "";
  if (reason.length < 3 || reason.length > 300) throw new AdminError(400,"INVALID_BAN_REASON");
  const raw = value?.expiresAt;
  if (raw == null || raw === "") return {reason,expiresAt:null};
  if (typeof raw !== "string" || raw.length > 40) throw new AdminError(400,"INVALID_BAN_EXPIRY");
  const date=Date.parse(raw);
  if (!Number.isFinite(date) || date <= Date.now() || date > Date.now() + 5*365*86400000)
    throw new AdminError(400,"INVALID_BAN_EXPIRY");
  return {reason,expiresAt:new Date(date).toISOString()};
}
export function validateIp(value) {
  if (typeof value !== "string" || value.length > 45 || isIP(value.trim()) === 0)
    throw new AdminError(400,"INVALID_IP_ADDRESS");
  return value.trim();
}
export function safeSearch(value) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0,80).toLocaleLowerCase("en-US");
}
export function noStore(res) {
  res.setHeader("Cache-Control","private, no-store, max-age=0");
  res.setHeader("Content-Type","application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options","nosniff");
}
