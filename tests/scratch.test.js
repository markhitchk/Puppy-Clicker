import { test } from "node:test";
import assert from "node:assert/strict";
import { freshGame, sanitizeGame } from "../src/game.js";
import {
  SCRATCH_COLUMNS, SCRATCH_ROWS, SCRATCH_REVEAL_THRESHOLD,
  scratchCoverage, markScratchCells, startScratchRound, settleScratchRound,
} from "../src/scratch.js";

test("scratching covers a continuous trail and respects the Kotlin 68% threshold", () => {
  let cells = new Set();
  const size = { width: 288, height: 120 };
  cells = markScratchCells(cells, { x: 2, y: 6 }, { x: 286, y: 6 }, size, 100);
  assert.ok(cells.size > 10);
  assert.equal(scratchCoverage(new Set()), 0);
  for (let row = 1; row < SCRATCH_ROWS; row++)
    cells = markScratchCells(cells, { x: 0, y: row * 12 + 6 }, { x: 288, y: row * 12 + 6 }, size, 100);
  assert.equal(SCRATCH_COLUMNS * SCRATCH_ROWS, 240);
  assert.ok(scratchCoverage(cells) >= SCRATCH_REVEAL_THRESHOLD);
  assert.ok(scratchCoverage(cells) <= 1);
});

test("scratch wager commits outcome, settles once and survives save recovery", () => {
  const game = freshGame();
  game.casinoChips = 250;
  assert.equal(startScratchRound(game, 20, 61, 12345), true);
  assert.equal(game.casinoChips, 230);
  assert.equal(startScratchRound(game, 20, 50), false);
  const restored = sanitizeGame(JSON.parse(JSON.stringify(game)));
  assert.equal(restored.lastCasinoResult.scratchPending, true);
  assert.equal(settleScratchRound(restored), true);
  const paid = restored.casinoChips;
  assert.equal(settleScratchRound(restored), false);
  assert.equal(restored.casinoChips, paid);
});

test("invalid scratch records cannot pay or block valid turns", () => {
  const g = freshGame();
  g.casinoChips = 20;
  assert.equal(startScratchRound(g, 25, 4), false);
  assert.equal(g.casinoChips, 20);
  assert.equal(startScratchRound(g, 20, 4), true);
  g.lastCasinoResult.payout = 9999999;
  assert.equal(settleScratchRound(g), false);
  assert.equal(g.casinoChips, 0);
});
