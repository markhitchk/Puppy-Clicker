// Scratchers parity contract: PuppyScratchersEngine.REVEAL_THRESHOLD = 0.68.
// Kotlin uses a higher-density 48x20 canvas. React Native currently uses
// lower-density view tiles until its native scratch-mask renderer is ported.
import { casinoSpend, casinoPayout } from "./game.js";
import { SCRATCHERS, scratcherOutcome } from "./casinoV7.js";

export const SCRATCH_COLUMNS = 24;
export const SCRATCH_ROWS = 10;
export const SCRATCH_REVEAL_THRESHOLD = 0.68;

export function scratchCoverage(cells) {
  return Math.min(1, cells.size / (SCRATCH_COLUMNS * SCRATCH_ROWS));
}

// Sample the entire pointer segment rather than just endpoints: quick swipes
// must clear a continuous trail. Match Kotlin's speed-sensitive brush concept.
export function markScratchCells(before, from, to, size, durationMs = 16) {
  if (!from || !to || !size || size.width <= 0 || size.height <= 0) return before;
  if (![from.x, from.y, to.x, to.y, size.width, size.height].every(Number.isFinite))
    return before;
  const cells = new Set(before);
  const cellW = size.width / SCRATCH_COLUMNS;
  const cellH = size.height / SCRATCH_ROWS;
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const speed = distance / Math.max(1, durationMs);
  const radius = Math.max(
    Math.min(cellW, cellH) * 1.45,
    Math.min(size.width, size.height) * (0.075 + Math.min(0.025, speed / 120)),
  );
  const steps = Math.max(1, Math.ceil(distance / (Math.min(cellW, cellH) * 0.6)));
  for (let step = 0; step <= steps; step++) {
    const fraction = step / steps;
    const x = Math.min(size.width, Math.max(0, from.x + (to.x - from.x) * fraction));
    const y = Math.min(size.height, Math.max(0, from.y + (to.y - from.y) * fraction));
    const left = Math.max(0, Math.floor((x - radius) / cellW));
    const right = Math.min(SCRATCH_COLUMNS - 1, Math.floor((x + radius) / cellW));
    const top = Math.max(0, Math.floor((y - radius) / cellH));
    const bottom = Math.min(SCRATCH_ROWS - 1, Math.floor((y + radius) / cellH));
    for (let row = top; row <= bottom; row++) {
      for (let col = left; col <= right; col++) {
        const dx = (col + 0.5) * cellW - x;
        const dy = (row + 0.5) * cellH - y;
        if (dx * dx + dy * dy <= radius * radius)
          cells.add(row * SCRATCH_COLUMNS + col);
      }
    }
  }
  return cells;
}

const PRIZES = {
  NO_PRIZE: { symbol: null, multiplier: 0 },
  REFUND: { symbol: "🍪", multiplier: 100 },
  DOUBLE: { symbol: "🦴", multiplier: 200 },
  BIG_WIN: { symbol: "⭐", multiplier: 500 },
  JACKPOT: { symbol: "💎", multiplier: 2000 },
};

export function startScratchRound(game, wager, roll, now = Date.now()) {
  if (game.lastCasinoResult?.scratchPending) return false;
  if (!SCRATCHERS.some((card) => card.wager === wager)) return false;
  if (!Number.isSafeInteger(roll) || roll < 0 || roll >= 100) return false;
  if (!casinoSpend(game, wager)) return false;
  const result = scratcherOutcome(wager, roll);
  // Commit the entire outcome before scratching; settle its prize once
  // after the player scratches 68% of the coating.
  game.lastCasinoResult = {
    ...result, game: "scratch", wager, startedAtMs: now,
    scratchPending: true,
  };
  return true;
}

export function settleScratchRound(game) {
  const round = game.lastCasinoResult;
  if (!round || round.game !== "scratch" || round.scratchPending !== true)
    return false;
  const prize = PRIZES[round.prize];
  if (!prize || !SCRATCHERS.some((c) => c.wager === round.wager))
    return false;
  const expectedSymbols = prize.symbol
    ? [prize.symbol, prize.symbol, prize.symbol]
    : ["🐾", "🍪", "🦴"];
  if (
    !Array.isArray(round.symbols) ||
    round.symbols.length !== 3 ||
    round.symbols.some((s, i) => s !== expectedSymbols[i]) ||
    !Number.isSafeInteger(round.payout) ||
    round.payout !== Math.floor(round.wager * prize.multiplier / 100)
  ) return false;
  // Write one mutated game snapshot so refreshes and duplicate reveal events
  // cannot award the same local round again.
  casinoPayout(game, round.payout);
  round.scratchPending = false;
  return true;
}
