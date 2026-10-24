import { test } from "node:test";
import assert from "node:assert/strict";
import * as bj from "../src/blackjack.js";
import { freshGame, sanitizeGame } from "../src/game.js";
const deck = (...prefix) => [
  ...prefix,
  ...Array.from({ length: 52 }, (_, i) => i).filter((x) => !prefix.includes(x)),
];
// Same deck fixtures as Kotlin PuppyBlackjackEngineTest.kt.
test("player and dealer naturals resolve immediately with 3:2 payout or push", () => {
  let s = bj.newRound(100, deck(0, 9, 12, 6));
  assert.equal(s.complete, true);
  assert.equal(bj.outcome(s).payout, 250);
  s = bj.newRound(100, deck(9, 0, 6, 12));
  assert.equal(bj.outcome(s).payout, 0);
  s = bj.newRound(100, deck(0, 13, 12, 25));
  assert.equal(bj.outcome(s).payout, 100);
});
test("dealer stands on soft 17", () => {
  const s = bj.act(bj.newRound(100, deck(9, 0, 6, 18, 1)), "stand").state;
  assert.equal(s.complete, true);
  assert.equal(s.dealerCards.length, 2);
  assert.equal(bj.value(s.dealerCards).total, 17);
});
test("double charges one equal wager and gives one card", () => {
  const r = bj.act(bj.newRound(100, deck(4, 7, 5, 8, 9, 2, 3)), "double");
  assert.equal(r.additional, 100);
  assert.equal(r.state.hands[0].wager, 200);
  assert.equal(r.state.hands[0].cards.length, 3);
  assert.equal(r.state.complete, true);
});
test("split aces get one card and split 21 is never a natural", () => {
  const r = bj.act(bj.newRound(100, deck(0, 4, 13, 8, 12, 1, 2)), "split");
  assert.equal(r.additional, 100);
  assert.equal(r.state.hands.length, 2);
  assert.equal(r.state.complete, true);
  assert.ok(r.state.hands.every((h) => h.splitAces && h.cards.length === 2));
  assert.notEqual(bj.outcome(r.state).hands[0].result, "BLACKJACK");
});
test("wallet rejects unaffordable double without changing cards or charging", () => {
  const g = freshGame();
  g.casinoChips = 100;
  bj.start(g, 100, deck(4, 7, 5, 8, 9, 2, 3));
  const before = structuredClone(g);
  assert.equal(bj.command(g, "double"), false);
  assert.deepEqual(g, before);
});
test("unfinished hands survive cloud save roundtrip and settle only once", () => {
  const g = freshGame();
  g.casinoChips = 200;
  bj.start(g, 100, deck(9, 8, 6, 7, 1));
  const copy = sanitizeGame(JSON.parse(JSON.stringify(g)));
  assert.equal(copy.blackjackRound.state.complete, false);
  assert.equal(bj.command(copy, "stand"), true);
  assert.equal(copy.casinoChips, 200);
  const saved = structuredClone(copy);
  assert.equal(bj.command(copy, "stand"), false);
  assert.deepEqual(copy, saved);
});
test("state validator rejects duplicate cards and invalid saved wagers", () => {
  const s = bj.newRound(100, deck(4, 7, 5, 8, 9));
  s.remainingDeck[0] = 4;
  assert.equal(bj.validateRound({ state: s, settled: false }), null);
});
test("completed but unsettled save can recover its payout exactly once", () => {
  const g = freshGame();
  g.casinoChips = 50;
  g.blackjackRound = {
    state: bj.newRound(100, deck(0, 9, 12, 6)),
    settled: false,
  };
  assert.equal(bj.recover(g), true);
  assert.equal(g.casinoChips, 300);
  assert.equal(bj.recover(g), false);
  assert.equal(g.casinoChips, 300);
});
test("saved recovery rejects incomplete hand flags and unresolved terminal state", () => {
  const natural = bj.newRound(100, deck(0, 9, 12, 6));
  delete natural.hands[0].stood;
  assert.equal(bj.validateRound({ state: natural, settled: false }), null);
  const pending = bj.newRound(100, deck(4, 7, 5, 8, 9));
  pending.complete = true;
  pending.activeHandIndex = -1;
  assert.equal(bj.validateRound({ state: pending, settled: false }), null);
});
