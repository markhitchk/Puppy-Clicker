import test from "node:test";
import assert from "node:assert/strict";
import {isBrowserSessionId,safeWebsitePath} from "../api/_lib/webPresence.js";

test("only random v4 browser session UUIDs are accepted",()=>{
  assert.equal(isBrowserSessionId("b3fc07a2-2acc-4c84-99ad-f9f701e93e8b"),true);
  assert.equal(isBrowserSessionId("deadbeef"),false);
  assert.equal(isBrowserSessionId("b3fc07a2-2acc-1c84-99ad-f9f701e93e8b"),false);
  assert.equal(isBrowserSessionId({id:"b3fc07a2-2acc-4c84-99ad-f9f701e93e8b"}),false);
});

test("audit path excludes query strings, fragments and unsafe paths",()=>{
  assert.equal(safeWebsitePath("/account/admin/users?token=not-stored"),"/account/admin/users");
  assert.equal(safeWebsitePath("/play#section"),"/play");
  assert.equal(safeWebsitePath("https://example.com/"),"/");
  assert.equal(safeWebsitePath("/a b"),"/");
  assert.equal(safeWebsitePath("/" + "a".repeat(160)),"/");
});
