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

test("verified presence captures request-header User-Agent and server-derived IP",async()=>{
  const {readFileSync}=await import("node:fs");
  const presence=readFileSync(new URL("../api/presence.js",import.meta.url),"utf8");
  const admin=readFileSync(new URL("../api/admin.js",import.meta.url),"utf8");
  const ui=readFileSync(new URL("../src/AdminPortal.jsx",import.meta.url),"utf8");
  assert.match(presence,/getClientIp\(req\.headers,process\.env\.VERCEL==="1"\)/);
  assert.match(presence,/req\.headers\["user-agent"\]/);
  assert.match(presence,/account_uuid:account\.id,auth_user_id:authUserId/);
  assert.ok(!presence.includes("req.body.ip"));
  assert.ok(!presence.includes("req.body.userAgent"));
  assert.match(admin,/select\("account_uuid,ip_address,user_agent,path,started_at,last_seen_at,ended_at"\)/);
  assert.match(ui,/<th>IP address<\/th><th>User-Agent<\/th>/);
  assert.match(ui,/lastIp\(user\)/);
  assert.match(ui,/lastUserAgent\(user\)/);
});
