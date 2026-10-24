import { test } from "node:test";
import assert from "node:assert/strict";
import * as codes from "../src/redeem.js";
import { freshGame } from "../src/game.js";
test("redeem bundle is atomic and idempotent", () => {
  const g = freshGame(),
    code = {
      id: "test",
      hash: "abc",
      status: "active",
      rewards: [
        { type: "treats", amount: 100 },
        { type: "upgrade_tickets", rarity: "COMMON", amount: 2 },
      ],
    };
  assert.equal(codes.redeem(g, "abc", { rewards: [code] }).success, true);
  assert.equal(g.treats, 100);
  assert.equal(g.ticketInventory.COMMON, 2);
  assert.equal(codes.redeem(g, "abc", { rewards: [code] }).success, false);
  assert.equal(g.treats, 100);
});
test("unsupported, role and seasonal rewards never partially grant a bundle", () => {
  for (const reward of [
    { type: "badge", id: "staff" },
    { type: "puppy", puppyId: "v2_dev_pup" },
    { type: "puppy", puppyId: "santa" },
  ]) {
    const g = freshGame(),
      before = structuredClone(g);
    assert.equal(
      codes.redeem(g, "abc", {
        rewards: [
          {
            id: "test",
            hash: "abc",
            status: "active",
            rewards: [{ type: "treats", amount: 100 }, reward],
          },
        ],
      }).success,
      false,
    );
    assert.deepEqual(g, before);
  }
});
test("limited-time and restricted codes fail closed without verified backend time/role", () => {
  for (const extra of [
    { expiresAt: "2027-01-01" },
    { flags: ["DEV_ONLY"] },
    { status: "disabled" },
  ]) {
    const g = freshGame();
    assert.equal(
      codes.redeem(g, "abc", {
        rewards: [
          {
            id: "test",
            hash: "abc",
            status: "active",
            rewards: [{ type: "treats", amount: 100 }],
            ...extra,
          },
        ],
      }).success,
      false,
    );
    assert.equal(g.treats, 0);
  }
});
