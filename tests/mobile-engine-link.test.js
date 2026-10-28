import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  MAX_PLAYER_LEVEL, MAX_PLAYER_XP, addBoundedXp, xpLevel,
} from "../src/mobile/engine/balancedProgression.js";
import { v6WalletFormat, v6PlaySizing } from "../src/mobile/engine/playV6.js";
import { addXp, playerLevel } from "../src/parity.js";

test("web XP is bounded by the React Native rules without reducing old saves", () => {
  assert.equal(MAX_PLAYER_LEVEL, 100);
  assert.equal(MAX_PLAYER_XP, 250_000);
  assert.equal(xpLevel(MAX_PLAYER_XP), 100);
  assert.equal(addBoundedXp(249_999, 100), 250_000);
  const game = { playerXp: 249_999 };
  assert.equal(addXp(game, "CARE_ACTION"), true);
  assert.equal(game.playerXp, MAX_PLAYER_XP);
  assert.equal(playerLevel(game), 100);
  const historical = { playerXp: 300_000 };
  addXp(historical, "MANUAL_TAP");
  assert.equal(historical.playerXp, 300_000);
  assert.equal(playerLevel(historical), 100);
});
test("V6 wallet display compacts large numbers while retaining gameplay values", () => {
  assert.equal(v6WalletFormat(4500000000000000), "4.5Qa");
  assert.equal(v6WalletFormat(1200), "1.2K");
  assert.equal(v6PlaySizing(320).circle, 258);
  assert.equal(v6PlaySizing(180).circle, 148);
});
test("synced source manifest points to the upstream Android React Native app", () => {
  const source = JSON.parse(readFileSync(new URL("../src/mobile/engine/SOURCE.json", import.meta.url)));
  assert.equal(source.upstream, "markhitchk/pup-clinker");
  assert.match(source.commit, /^[a-f0-9]{40}$/);
  assert.deepEqual(source.files, [
    "Mobile/src/engine/balancedProgression.js",
    "Mobile/src/engine/playV6.js",
  ]);
});
