import { test } from "node:test";
import assert from "node:assert/strict";
import * as core from "../src/game.js";
import * as parity from "../src/parity.js";

// Expected values transcribed from PuppyCareSystem/PuppyMonthlyRewards/
// PuppyProgression/PuppyRosterModel in the Kotlin launcher, not from the JS port.
test("offline care decay caps at 240 minutes and keeps bond", () => {
  const g = core.freshGame();
  g.careUpdatedAtMs = 1000;
  parity.advanceCare(g, 1000 + 300 * 60000, true);
  assert.deepEqual(
    [g.happiness, g.fullness, g.energy, g.cleanliness, g.bond],
    [20, 0, 40, 40, 10],
  );
  const before = structuredClone(g);
  parity.advanceCare(g, 1000 + 300 * 60000, true);
  assert.deepEqual(g, before);
});
test("foreground care decays every 120 seconds without losing subinterval time", () => {
  const g = core.freshGame();
  g.careUpdatedAtMs = 1000;
  parity.advanceCare(g, 120999);
  assert.equal(g.energy, 100);
  parity.advanceCare(g, 121000);
  assert.equal(g.energy, 99);
  assert.equal(g.fullness, 98);
  parity.advanceCare(g, 121001);
  assert.equal(g.energy, 99);
});
test("renames and care survive switching puppies and save roundtrip", () => {
  const g = core.freshGame();
  assert.equal(parity.renamePuppy(g, "  Sir Buddy  "), true);
  g.energy = 30;
  core.switchPuppy(g, "golden");
  parity.renamePuppy(g, "Sunny Pup");
  core.switchPuppy(g, "classic");
  assert.equal(g.puppyName, "Sir Buddy");
  assert.equal(g.energy, 30);
  const copy = core.sanitizeGame(JSON.parse(JSON.stringify(g)));
  core.switchPuppy(copy, "golden");
  assert.equal(copy.puppyName, "Sunny Pup");
});
test("daily goals rotate with Kotlin day-of-month targets and validate schedules", () => {
  const date = new Date(2026, 9, 23, 12);
  const goals = parity.dailyGoals(date);
  assert.deepEqual(
    goals.map((x) => [x.id, x.target, x.rewardTreats]),
    [
      ["tap_time", 90, 360],
      ["good_care", 4, 310],
      ["shop_visit", 1, 400],
      ["wellness", 85, 420],
    ],
  );
  assert.equal(
    parity.parseSchedule(
      { schemaVersion: 1, month: "2026-09", days: {} },
      "2026-10",
    ),
    null,
  );
  const valid = parity.parseSchedule(
    {
      schemaVersion: 1,
      month: "2026-10",
      days: {
        23: [
          { id: "custom", type: "taps", target: 2, rewardTreats: 30 },
          { id: "bad", type: "wellness", target: 101, rewardTreats: 50 },
        ],
      },
    },
    "2026-10",
  );
  assert.equal(parity.dailyGoals(date, valid).length, 1);
});
test("claiming a completed goal pays exact currencies once and next reward advances", () => {
  const date = new Date(2026, 9, 23, 12),
    g = core.freshGame();
  parity.rollDay(g, date);
  const id = "tap_time";
  g.totalTaps = g.dailyTapStart + 90;
  assert.equal(parity.claimGoal(g, id, date), true);
  assert.deepEqual([g.treats, g.bones, g.pupCoins], [360, 1, 1]);
  assert.equal(parity.claimGoal(g, id, date), false);
  assert.equal(parity.nextGoal(g, date).id, "good_care");
});
test("daily rollover never credits yesterday and allows a new claim", () => {
  const g = core.freshGame(),
    a = new Date(2026, 9, 23, 12),
    b = new Date(2026, 9, 24, 12);
  parity.rollDay(g, a);
  g.totalTaps = 100;
  g.claimedDailyTasks = ["tap_time"];
  parity.rollDay(g, b);
  assert.equal(parity.goalProgress(g, parity.dailyGoals(b)[0]), 0);
  assert.deepEqual(g.claimedDailyTasks, []);
});
test("XP events and achievement settlement are idempotent across save reload", () => {
  const g = core.freshGame();
  parity.addXp(g, "CARE_ACTION", "care:1");
  parity.addXp(g, "CARE_ACTION", "care:1");
  assert.equal(g.playerXp, 5);
  g.lifetimeTreats = 100;
  parity.settleAchievements(g);
  const xp = g.playerXp;
  const copy = core.sanitizeGame(JSON.parse(JSON.stringify(g)));
  parity.settleAchievements(copy);
  assert.equal(copy.playerXp, xp);
  assert.ok(copy.achievementRewarded.includes("happy_home"));
});
test("roster supports category, search, favorites, and unlocked status together", () => {
  const g = core.freshGame();
  parity.toggleFavorite(g, "golden");
  assert.deepEqual(
    parity
      .queryRoster(g, {
        search: "sun",
        favoritesOnly: true,
        status: "UNLOCKED",
      })
      .map((p) => p.id),
    ["golden"],
  );
  assert.equal(parity.toggleFavorite(g, "fake"), false);
});
test("gacha charges only when a valid pull can be delivered and never selects reward-only pups", () => {
  const g = core.freshGame();
  assert.equal(parity.pullGacha(g, "TREATS", 0).success, false);
  g.treats = 2500;
  const result = parity.pullGacha(g, "TREATS", 0);
  assert.equal(result.success, true);
  assert.equal(g.treats, 0);
  assert.equal(
    core.ROSTER.find((p) => p.id === result.puppyId).redeemOnly,
    false,
  );
});
test("old save migration preserves timestamps, preferences and legacy XP baseline", () => {
  const g = core.sanitizeGame({ lifetimeTreats: 123, lastActiveAt: 1000 });
  assert.equal(g.playerXp, 123);
  assert.equal(g.careUpdatedAtMs, 1000);
});
test("all source roster groups include the manifest-only test puppies", () => {
  assert.ok(
    core.ROSTER.some(
      (p) =>
        p.id === "test_v1_crash_dummy" && p.group === "test" && !p.redeemOnly,
    ),
  );
  assert.ok(
    core.ROSTER.some(
      (p) =>
        p.id === "test_v2_crash_dummy" && p.group === "test" && !p.redeemOnly,
    ),
  );
  const g = core.freshGame();
  g.treats = 2500;
  const result = parity.pullGacha(g, "TREATS", 0);
  assert.equal(result.isNewUnlock, true);
});
