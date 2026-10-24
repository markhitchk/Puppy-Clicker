import { test } from "node:test";
import assert from "node:assert/strict";
import * as auth from "../src/nativeAuth.js";
test("cold callback exchanges PKCE code and warm/event duplicates exchange only once", async () => {
  let count = 0,
    release;
  const wait = new Promise((r) => (release = r));
  const handler = auth.createCallbackHandler(
    "puppyclicker://auth/callback",
    async (code) => {
      assert.equal(code, "sample");
      count++;
      await wait;
      return { error: null };
    },
  );
  const cold = handler("puppyclicker://auth/callback?code=sample"),
    event = handler("puppyclicker://auth/callback?code=sample");
  release();
  assert.equal(await cold, true);
  assert.equal(await event, true);
  assert.equal(await handler("puppyclicker://auth/callback?code=sample"), true);
  assert.equal(count, 1);
});
test("unrelated URLs cannot trigger an exchange and provider errors are shown", async () => {
  let count = 0;
  const handler = auth.createCallbackHandler(
    "puppyclicker://auth/callback",
    async () => {
      count++;
      return { error: null };
    },
  );
  for (const url of [
    "https://evil.example/auth/callback?code=a",
    "puppyclicker://other/callback?code=a",
    "not a URL",
  ])
    assert.equal(await handler(url), false);
  assert.equal(count, 0);
  await assert.rejects(
    handler("puppyclicker://auth/callback?error_description=Access%20denied"),
    /Access denied/,
  );
});
test("failed code exchange can retry without being mistaken for completed login", async () => {
  let count = 0;
  const handler = auth.createCallbackHandler(
    "puppyclicker://auth/callback",
    async () => ({
      error: count++ === 0 ? new Error("Network unavailable") : null,
    }),
  );
  await assert.rejects(
    handler("puppyclicker://auth/callback?code=a"),
    /Network unavailable/,
  );
  assert.equal(await handler("puppyclicker://auth/callback?code=a"), true);
  assert.equal(count, 2);
});
