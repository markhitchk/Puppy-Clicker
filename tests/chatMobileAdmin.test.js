import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
test("admin navigation styles all buttons and links with one responsive grid",()=>{
 const css=readFileSync(new URL("../src/styles/shared/admin.css",import.meta.url),"utf8");
 assert.match(css,/\.pup-admin-tabs\s*\{[^}]*display:grid/);
 assert.match(css,/\.pup-admin-tabs\s+button,\s*\.pup-admin-tabs\s+a\.pup-admin-link/);
 const mobile=readFileSync(new URL("../src/styles/mobile/admin.css",import.meta.url),"utf8");
 assert.match(mobile,/@media\s*\(max-width:650px\)[^{]*\{[^}]*\.pup-admin-tabs/);
});
test("chat UI includes avatars, mention suggestion controls, and usable username mention action",()=>{
 const source=readFileSync(new URL("../src/CommunityChat.jsx",import.meta.url),"utf8");
 assert.match(source,/chat-user-avatar/);
 assert.match(source,/chat-mention-suggestions/);
 assert.match(source,/insertMention/);
});
