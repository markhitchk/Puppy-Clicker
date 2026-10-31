import test from "node:test";
import assert from "node:assert/strict";
import {parseLegalMarkdown,safeLegalHref,legalSlug} from "../src/legalMarkdown.js";
test("safe legal links allow only expected URLs",()=>{
 assert.equal(safeLegalHref("javascript:alert(1)"),null);
 assert.equal(safeLegalHref("data:text/html,evil"),null);
 assert.equal(safeLegalHref("//host.example"),null);
 assert.equal(safeLegalHref("https://example.org/document"),"https://example.org/document");
 assert.equal(safeLegalHref("/privacy"),"/privacy");
});
test("Markdown model preserves document sections and original text",()=>{
 const doc=parseLegalMarkdown("# Title\n\n> **Effective date:** Today\n\n## 1. General\n\n- One\n- Two\n\n## 1. General\n");
 assert.equal(doc.headings.length,3);
 assert.equal(doc.headings[1].id,"1-general");
 assert.equal(doc.headings[2].id,"1-general-2");
 assert.equal(doc.blocks.find(b=>b.kind==="list").items.length,2);
 assert.equal(doc.blocks.find(b=>b.kind==="quote").text,"**Effective date:** Today");
 assert.equal(legalSlug("¡Español! Privacy"),"espanol-privacy");
});
