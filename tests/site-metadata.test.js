import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";

const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const meta=(attribute,key)=>{
 const opening=html.match(new RegExp('<meta\\s+'+attribute+'="'+key+'"[^>]*>'));
 return opening?.[0]?.match(/content="([^"]*)"/)?.[1]??null;
};

test("Puppy Clicker homepage has meaningful SEO title and description",()=>{
 const title=html.match(/<title>([^<]+)<\/title>/)?.[1];
 const description=meta("name","description");
 assert.match(title,/^Puppy Clicker/);
 assert.match(title,/Tap, Collect/);
 assert.match(description,/Tap for Treats/);
 assert.match(description,/V1 and V2 puppies/);
 assert.match(description,/Try the demo free/);
 assert.ok(description.length<=160,"Search description should remain concise");
 assert.doesNotMatch(description,/React web edition/i);
});

test("Open Graph and Twitter social previews match the search metadata",()=>{
 const title=html.match(/<title>([^<]+)<\/title>/)?.[1];
 const description=meta("name","description");
 assert.equal(meta("property","og:site_name"),"Puppy Clicker");
 assert.equal(meta("property","og:type"),"website");
 assert.equal(meta("property","og:title"),title);
 assert.equal(meta("property","og:description"),description);
 assert.equal(meta("name","twitter:card"),"summary");
 assert.equal(meta("name","twitter:title"),title);
 assert.equal(meta("name","twitter:description"),description);
 const image="https://puppy-clicker.vercel.app/assets/logos/puppy_clicker.png";
 assert.equal(meta("property","og:image"),image);
 assert.equal(meta("name","twitter:image"),image);
 assert.ok(existsSync(new URL("../public/assets/logos/puppy_clicker.png",import.meta.url)));
 assert.match(html,/rel="icon"/);
 assert.match(html,/rel="apple-touch-icon"/);
 // Don't canonicalize /play?=demo, /play or /puppies to the homepage.
 assert.doesNotMatch(html,/rel="canonical"/);
});
