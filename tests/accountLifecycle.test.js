import { test } from "node:test";
import assert from "node:assert/strict";
import * as lifecycle from "../src/accountLifecycle.js";
import { freshGame } from "../src/game.js";
test("resume mutation applies only capped offline decay, not background foreground ticks", () => {
  const g = freshGame();
  g.careUpdatedAtMs = 1000;
  const next = lifecycle.applyMutation(g, () => {}, {
    now: 1000 + 300 * 60000,
    offline: true,
  });
  assert.deepEqual(
    [next.happiness, next.fullness, next.energy, next.cleanliness],
    [20, 0, 40, 40],
  );
});
test("logout blocks mutation before awaiting save and retains state on failure", async () => {
  let finish;
  const pending = new Promise((r) => (finish = r)),
    state = { closing: false, dirty: true };
  let signedOut = false;
  const result = lifecycle.closeAccount(
    state,
    async () => {
      await pending;
      state.dirty = false;
      return true;
    },
    async () => {
      signedOut = true;
      return { error: null };
    },
  );
  assert.equal(state.closing, true);
  finish();
  assert.equal(await result, true);
  assert.equal(signedOut, true);
  assert.equal(state.closing, false);
});
test("logout cannot drop dirty progress after a rejected or incomplete save", async () => {
  for (const saved of [false, true]) {
    let signedOut = false;
    const state = { closing: false, dirty: true };
    assert.equal(
      await lifecycle.closeAccount(
        state,
        async () => saved,
        async () => {
          signedOut = true;
          return { error: null };
        },
      ),
      false,
    );
    assert.equal(signedOut, false);
    assert.equal(state.closing, false);
  }
});
