// Contracts: Kotlin PuppyCareSystem, PuppyMonthlyRewards, PuppyProgression,
// PuppyAchievementsV6, PuppyRosterModel and PuppyGachaEngine. Isolated React saves only.
import { ROSTER, wellness, level, withGain } from "./game.js";
const MAX = Number.MAX_SAFE_INTEGER;
export const epochDay = (date = new Date()) =>
  Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000,
  );
export const monthKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
export function advanceCare(g, now = Date.now(), offline = false) {
  const at = g.careUpdatedAtMs ?? g.lastActiveAt ?? now;
  if (now < at) return false;
  const minutes = Math.min(240, Math.floor((now - at) / 60000));
  const ticks = Math.floor((now - at) / 120000);
  if (offline) {
    g.happiness = Math.max(0, g.happiness - Math.floor(minutes / 3));
    g.fullness = Math.max(0, g.fullness - Math.floor(minutes / 2));
    g.energy = Math.max(0, g.energy - Math.floor(minutes / 4));
    g.cleanliness = Math.max(0, g.cleanliness - Math.floor(minutes / 4));
    g.careUpdatedAtMs = now;
  } else {
    if (!ticks) return false;
    g.happiness = Math.max(0, g.happiness - ticks);
    g.fullness = Math.max(0, g.fullness - 2 * ticks);
    g.energy = Math.max(0, g.energy - ticks);
    g.cleanliness = Math.max(0, g.cleanliness - ticks);
    g.careUpdatedAtMs = at + ticks * 120000;
  }
  return true;
}
export function renamePuppy(g, name) {
  const value = String(name).trim().slice(0, 18);
  if (!value) return false;
  g.puppyNames ??= {};
  g.puppyNames[g.puppyStyle] = value;
  g.puppyName = value;
  return true;
}
export function toggleFavorite(g, id) {
  if (!ROSTER.some((p) => p.id === id)) return false;
  g.favoritePuppies = g.favoritePuppies.includes(id)
    ? g.favoritePuppies.filter((p) => p !== id)
    : [...g.favoritePuppies, id];
  return true;
}
export function queryRoster(g, q = {}) {
  const search = (q.search || "").trim().toLowerCase();
  const out = ROSTER.filter(
    (p) =>
      (!q.category || p.group === q.category) &&
      (!q.favoritesOnly || g.favoritePuppies.includes(p.id)) &&
      (q.status !== "UNLOCKED" || g.unlockedPuppies.includes(p.id)) &&
      (q.status !== "LOCKED" || !g.unlockedPuppies.includes(p.id)) &&
      (!search || (p.name + " " + p.id).toLowerCase().includes(search)),
  );
  return out.sort((a, b) =>
    q.sort === "NAME_ASC"
      ? a.name.localeCompare(b.name)
      : q.sort === "NAME_DESC"
        ? b.name.localeCompare(a.name)
        : q.sort === "NEWEST_ADDED"
          ? b.number - a.number
          : q.sort === "OLDEST_ADDED"
            ? a.number - b.number
            : Number(g.unlockedPuppies.includes(b.id)) -
                Number(g.unlockedPuppies.includes(a.id)) || a.number - b.number,
  );
}
export function rollDay(g, date = new Date()) {
  const day = epochDay(date);
  if (g.dailyDay === day) return false;
  g.dailyDay = day;
  g.dailyTapStart = g.totalTaps;
  g.dailyCareStart = g.careActions;
  g.dailyShopStart = g.totalShopPurchases;
  g.claimedDailyTasks = [];
  return true;
}
export function parseSchedule(root, expectedMonth) {
  if (
    root?.schemaVersion !== 1 ||
    root.month !== expectedMonth ||
    !root.days ||
    typeof root.days !== "object"
  )
    return null;
  const days = {},
    maxDay = new Date(
      +expectedMonth.slice(0, 4),
      +expectedMonth.slice(5),
      0,
    ).getDate();
  for (const [key, rows] of Object.entries(root.days)) {
    if (!/^\d+$/.test(key) || +key < 1 || +key > maxDay || !Array.isArray(rows))
      continue;
    const seen = new Set(),
      valid = [];
    for (const x of rows.slice(0, 12)) {
      if (
        !x ||
        x.enabled === false ||
        !/^[a-z0-9_-]{1,48}$/.test(x.id) ||
        seen.has(x.id)
      )
        continue;
      seen.add(x.id);
      if (
        !["taps", "care", "shop", "wellness", "bond", "tickets"].includes(
          x.type,
        ) ||
        !Number.isSafeInteger(x.target) ||
        x.target < 1 ||
        x.target > 1000000 ||
        !Number.isSafeInteger(x.rewardTreats) ||
        x.rewardTreats < 1 ||
        x.rewardTreats > 100000
      )
        continue;
      if (["wellness", "bond"].includes(x.type) && x.target > 100) continue;
      valid.push({
        id: x.id,
        type: x.type,
        target: x.target,
        rewardTreats: x.rewardTreats,
        emoji: String(x.emoji || "🎯").slice(0, 8),
        title: String(x.title || x.id).slice(0, 64),
        description: String(x.description || "").slice(0, 140),
      });
    }
    if (valid.length) days[key] = valid;
  }
  return Object.keys(days).length ? { month: expectedMonth, days } : null;
}
export function dailyGoals(date = new Date(), schedule = null) {
  if (
    schedule?.month === monthKey(date) &&
    schedule.days?.[date.getDate()]?.length
  )
    return schedule.days[date.getDate()];
  const i = Math.max(0, date.getDate() - 1),
    t = [50, 75, 90, 100][i % 4],
    c = [3, 4, 5][i % 3];
  return [
    {
      id: "tap_time",
      type: "taps",
      emoji: "🐾",
      title: "Tap Time",
      description: `Tap your puppy ${t} times`,
      target: t,
      rewardTreats: t * 4,
    },
    {
      id: "good_care",
      type: "care",
      emoji: "💖",
      title: "Good Care",
      description: `Complete ${c} care actions`,
      target: c,
      rewardTreats: 150 + c * 40,
    },
    {
      id: "shop_visit",
      type: "shop",
      emoji: "🛍️",
      title: "Shop Visit",
      description: "Buy 1 upgrade",
      target: 1,
      rewardTreats: 400,
    },
    {
      id: "wellness",
      type: "wellness",
      emoji: "✨",
      title: "Healthy Pup",
      description: "Reach 85% wellness",
      target: 85,
      rewardTreats: 420,
    },
  ];
}
export const goalProgress = (g, goal) =>
  Math.max(
    0,
    {
      taps: g.totalTaps - g.dailyTapStart,
      care: g.careActions - g.dailyCareStart,
      shop: g.totalShopPurchases - g.dailyShopStart,
      wellness: wellness(g),
      bond: g.bond,
      tickets: Object.values(g.ticketInventory).reduce((a, b) => a + b, 0),
    }[goal.type] || 0,
  );
export const nextGoal = (g, date = new Date(), schedule = null) =>
  dailyGoals(date, schedule).find((x) => !g.claimedDailyTasks.includes(x.id)) ||
  null;
export function claimGoal(g, id, date = new Date(), schedule = null) {
  rollDay(g, date);
  const goal = dailyGoals(date, schedule).find((x) => x.id === id);
  if (
    !goal ||
    g.claimedDailyTasks.includes(id) ||
    goalProgress(g, goal) < goal.target
  )
    return false;
  withGain(g, goal.rewardTreats);
  g.bones = Math.min(MAX, g.bones + 1);
  g.pupCoins = Math.min(MAX, g.pupCoins + 1);
  g.claimedDailyTasks.push(id);
  addXp(g, "DAILY_TASK", `daily:${g.dailyDay}:${id}`);
  return true;
}
export const XP_EVENTS = {
  MANUAL_TAP: 1,
  CARE_ACTION: 5,
  DAILY_TASK: 25,
  ACHIEVEMENT: 50,
  NEW_PUPPY: 100,
  EVENT_REWARD: 50,
};
export function addXp(g, event, settlementId = null) {
  if (!XP_EVENTS[event]) return false;
  g.xpSettlements ??= [];
  if (settlementId && g.xpSettlements.includes(settlementId)) return false;
  g.playerXp = Math.min(MAX, (g.playerXp || 0) + XP_EVENTS[event]);
  if (settlementId) g.xpSettlements.push(settlementId);
  return true;
}
export const playerLevel = (g) =>
  1 + Math.floor(Math.sqrt((g.playerXp || 0) / 100));
export const bondMilestone = (bond) =>
  bond >= 90
    ? "Forever Friend"
    : bond >= 70
      ? "Best Friend"
      : bond >= 50
        ? "Close Pal"
        : bond >= 25
          ? "Buddy"
          : "New Friend";
export const ACHIEVEMENTS = [
  ["first_treat", "First Treat", "🐾", 1, (g) => g.lifetimeTreats],
  ["snack_stash", "Snack Stash", "🍪", 100, (g) => g.lifetimeTreats],
  ["puppy_pro", "Puppy Pro", "🏆", 1000, (g) => g.lifetimeTreats],
  ["combo_hero", "Combo Hero", "🔥", 20, (g) => g.bestCombo],
  ["ticket_hunter", "Ticket Hunter", "🎟️", 1, (g) => g.totalTicketsFound],
  ["big_taps", "Big Taps", "💪", 25, (g) => g.clickPower],
  ["auto_pup", "Bone Collector", "🦴", 50, (g) => g.bones],
  [
    "happy_home",
    "Happy Home",
    "💖",
    90,
    (g) => Math.min(g.happiness, g.fullness, g.energy, g.cleanliness),
  ],
  ["level_ten", "Best Friend", "💜", 10, (g) => level(g)],
].map(([id, title, emoji, target, progress]) => ({
  id,
  title,
  emoji,
  target,
  progress,
}));
export function settleAchievements(g) {
  g.achievementRewarded ??= [];
  const added = [];
  for (const x of ACHIEVEMENTS)
    if (!g.achievementRewarded.includes(x.id) && x.progress(g) >= x.target) {
      g.achievementRewarded.push(x.id);
      addXp(g, "ACHIEVEMENT", `achievement:${x.id}`);
      added.push(x.title);
    }
  return added;
}
export function pullGacha(g, payment, roll) {
  const all = ROSTER.filter((p) => !p.redeemOnly).sort((a, b) =>
      a.id.localeCompare(b.id),
    ),
    unowned = all.filter((p) => !g.unlockedPuppies.includes(p.id)),
    pool = unowned.length ? unowned : all;
  if (
    !pool.length ||
    !Number.isSafeInteger(roll) ||
    !["TREATS", "COMMON_TICKET"].includes(payment)
  )
    return { success: false };
  if (payment === "TREATS" ? g.treats < 2500 : g.ticketInventory.COMMON < 1)
    return { success: false };
  const puppy = pool[((roll % pool.length) + pool.length) % pool.length],
    isNewUnlock = !g.unlockedPuppies.includes(puppy.id);
  if (payment === "TREATS") g.treats -= 2500;
  else g.ticketInventory.COMMON--;
  if (isNewUnlock) {
    g.unlockedPuppies.push(puppy.id);
    addXp(g, "NEW_PUPPY", `puppy:${puppy.id}`);
  }
  return { success: true, puppyId: puppy.id, isNewUnlock };
}
