import { ROSTER, RARITIES, withGain, switchPuppy } from "./game.js";
import { addXp } from "./parity.js";
export const CODE_SALT = "PUPPY_CLICKER_LOCAL_2026_V1|";
const seasonal = new Set(["halloween", "santa", "birthday"]),
  role = new Set(["dev_pup", "v2_dev_pup", "v2_discord_pup", "v2_harleytg"]);
export function redeem(g, hash, catalog) {
  const fail = (message) => ({ success: false, message });
  const c = catalog?.rewards?.find((x) => x.hash === hash);
  if (!c) return fail("Invalid Puppy Code.");
  if (g.redeemedCodeIds.includes(c.id))
    return fail("This Puppy Code was already redeemed.");
  if (c.status !== "active")
    return fail("This Puppy Code is currently unavailable.");
  const allowed = [
    "HIDDEN_PROMO",
    "SPECIAL_REVEAL",
    "EVENT_CODE",
    "PATREON_CODE",
    "BUG_BOUNTY",
    "NO_HISTORY_DETAILS",
  ];
  if (
    c.startsAt ||
    c.expiresAt ||
    c.minVersionCode ||
    c.maxVersionCode ||
    c.requiredRewardSchema > 2 ||
    (c.flags || []).some((x) => !allowed.includes(x))
  )
    return fail(
      "This code needs verified release, role or time information. Use the Kotlin app for this reward.",
    );
  if (!Array.isArray(c.rewards) || !c.rewards.length)
    return fail("Unsupported reward.");
  for (const reward of c.rewards) {
    if (reward.type === "treats") {
      if (
        !Number.isSafeInteger(reward.amount) ||
        reward.amount < 1 ||
        reward.amount > 10000000
      )
        return fail("Invalid Treat reward.");
    } else if (reward.type === "puppy") {
      if (
        !ROSTER.some((p) => p.id === reward.puppyId) ||
        seasonal.has(reward.puppyId) ||
        role.has(reward.puppyId)
      )
        return fail("This puppy requires a verified special reward.");
    } else if (reward.type === "upgrade_tickets") {
      if (
        !RARITIES.includes(reward.rarity) ||
        !Number.isInteger(reward.amount) ||
        reward.amount < 1 ||
        reward.amount > 100 ||
        g.ticketInventory[reward.rarity] +
          c.rewards
            .filter(
              (x) => x.type === "upgrade_tickets" && x.rarity === reward.rarity,
            )
            .reduce((n, x) => n + x.amount, 0) >
          9999
      )
        return fail("Ticket inventory limit.");
    } else return fail("This reward is not supported by this release.");
  }
  for (const r of c.rewards) {
    if (r.type === "treats") withGain(g, r.amount);
    else if (r.type === "upgrade_tickets")
      g.ticketInventory[r.rarity] += r.amount;
    else {
      if (!g.unlockedPuppies.includes(r.puppyId)) {
        g.unlockedPuppies.push(r.puppyId);
        addXp(g, "NEW_PUPPY", `puppy:${r.puppyId}`);
      }
      switchPuppy(g, r.puppyId);
    }
  }
  g.redeemedCodeIds.push(c.id);
  return { success: true, message: c.message || "Puppy Code redeemed!" };
}
