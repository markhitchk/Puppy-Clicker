import { test } from "node:test";
import assert from "node:assert/strict";
import { appendMessage, normalizeHistory, markHistoryRead, unreadCount, MAX_INBOX_ITEMS } from "../src/app/inbox.js";

const now = Date.UTC(2026, 9, 23);
test("notification history is bounded and rejects invalid, future and expired data", () => {
  const entries = Array.from({ length: 90 }, (_, i) => ({ id: `x${i}`, text: "Hello", createdAt: now - i, read: false }));
  entries.push({ id: "expired", text: "Old", createdAt: now - 91 * 86400000 });
  entries.push({ id: "future", text: "Future", createdAt: now + 90000 });
  entries.push({ id: "bad", text: "", createdAt: now });
  const result = normalizeHistory(entries, now);
  assert.equal(result.length, MAX_INBOX_ITEMS);
  assert.equal(result[0].id, "x0");
  assert.ok(result.every((item) => !["expired", "future", "bad"].includes(item.id)));
});
test("new messages are unread; read-all does not mutate original; roundtrip is stable", () => {
  const added = appendMessage([], "  Puppy gift claimed  ", now, "gift-1");
  assert.equal(added[0].text, "Puppy gift claimed");
  assert.equal(unreadCount(added), 1);
  const read = markHistoryRead(added);
  assert.equal(unreadCount(read), 0);
  assert.equal(unreadCount(added), 1);
  assert.deepEqual(normalizeHistory(JSON.parse(JSON.stringify(read)), now), read);
});
test("dedupe repeated IDs and sanitize malformed stored payloads", () => {
  assert.deepEqual(normalizeHistory(null, now), []);
  assert.equal(normalizeHistory([
    { id: "a", text: "First", createdAt: now },
    { id: "a", text: "Duplicate", createdAt: now },
    { id: {}, text: "Wrong", createdAt: now },
  ], now).length, 1);
});
