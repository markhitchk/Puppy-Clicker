import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import roster from "../src/data/roster.js";
import {puppyAssetId} from "../src/puppyLinks.js";
import {applyPuppySharePreview,getPuppySharePreview} from "../src/puppySharePreview.js";
import middleware,{config} from "../middleware.js";

const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");

test("Aurora social link uses actual roster name, description and artwork",()=>{
 const puppy=getPuppySharePreview("?pup=v1_aurora");
 assert.equal(puppy.name,"Aurora");
 assert.equal(puppy.id,"aurora");
 assert.match(puppy.title,/Aurora.*Puppy Clicker/);
 assert.match(puppy.description,/Aurora-purple and teal fur glow/);
 assert.match(puppy.description,/V1 puppy/);
 assert.equal(puppy.url,"https://puppy-clicker.vercel.app/puppies?pup=v1_aurora");
 assert.equal(puppy.image,"https://puppy-clicker.vercel.app/assets/v1/v1_aurora.png");
});


test("all roster preview images are the exact existing original puppy asset",()=>{
 for(const puppy of roster){
  const preview=getPuppySharePreview("?pup="+encodeURIComponent(puppyAssetId(puppy)));
  assert.ok(preview,"Missing preview for "+puppy.id);
  assert.equal(preview.image,"https://puppy-clicker.vercel.app"+puppy.image,puppy.id);
  assert.ok(existsSync(new URL("../public"+puppy.image,import.meta.url)),"Missing original art for "+puppy.id);
  assert.doesNotMatch(preview.image,/\\/transparent\\/|puppy_clicker\\.png/);
 }
});

test("other puppy links use their own metadata and accept legacy link forms",()=>{
 assert.equal(getPuppySharePreview("?pup=v2_frost").name,"Frost");
 assert.equal(getPuppySharePreview("?pup=v2_rory").name,"Rory");
 assert.equal(getPuppySharePreview("?pup=v1_aurora.png").name,"Aurora");
 assert.equal(getPuppySharePreview("?asset=v1_aurora").name,"Aurora");
 assert.equal(getPuppySharePreview("?=v1_aurora").name,"Aurora");
 assert.equal(getPuppySharePreview("?v1_aurora").name,"Aurora");
 assert.equal(getPuppySharePreview("?pup=not_a_puppy"),null);
 assert.equal(getPuppySharePreview("?utm_source=discord"),null);
 assert.equal(getPuppySharePreview("?pup="+("x".repeat(500))),null);
});

test("static HTML gets Open Graph, Twitter, canonical and SEO metadata for a puppy",()=>{
 const preview=getPuppySharePreview("?pup=v1_aurora");
 const result=applyPuppySharePreview(html,preview);
 assert.match(result,/<title>🌌 Aurora \| Puppy Clicker<\/title>/);
 assert.match(result,/<meta property="og:title" content="🌌 Aurora \| Puppy Clicker"/);
 assert.match(result,/<meta property="og:description" content="Aurora-purple and teal fur glow/);
 assert.match(result,/<meta property="og:url" content="https:\/\/puppy-clicker\.vercel\.app\/puppies\?pup=v1_aurora"/);
 assert.match(result,/<meta property="og:image" content="https:\/\/puppy-clicker\.vercel\.app\/assets\/v1\/v1_aurora\.png"/);
 assert.match(result,/<meta name="twitter:card" content="summary_large_image"/);
 assert.match(result,/<meta name="twitter:image" content="https:\/\/puppy-clicker\.vercel\.app\/assets\/v1\/v1_aurora\.png"/);
 assert.match(result,/<link rel="canonical" href="https:\/\/puppy-clicker\.vercel\.app\/puppies\?pup=v1_aurora"/);
 assert.match(result,/script type="module" src="\/src\/main\.jsx"/);
 assert.equal((result.match(/<meta property="og:title"/g)||[]).length,1);
 assert.equal(applyPuppySharePreview(html,null),html);
});

test("middleware serves preview metadata in HTML to all user agents",async()=>{
 assert.deepEqual(config.matcher,["/puppies"]);
 const before=globalThis.fetch;
 let fetched=null;
 globalThis.fetch=async input=>{
  fetched=String(input);
  return new Response(html,{headers:{"content-type":"text/html"}});
 };
 try{
  const response=await middleware(new Request("https://puppy-clicker.vercel.app/puppies?pup=v1_aurora",{
   headers:{"user-agent":"Discordbot/2.0"}
  }));
  assert.equal(response.status,200);
  assert.match(response.headers.get("content-type"),/text\/html/);
  assert.equal(fetched,"https://puppy-clicker.vercel.app/index.html");
  const body=await response.text();
  assert.match(body,/og:title" content="🌌 Aurora \| Puppy Clicker"/);
  assert.match(body,/og:image" content="https:\/\/puppy-clicker\.vercel\.app\/assets\/v1\/v1_aurora\.png"/);
  const generic=await middleware(new Request("https://puppy-clicker.vercel.app/puppies"));
  assert.equal(await generic.text(),html);
  const head=await middleware(new Request("https://puppy-clicker.vercel.app/puppies?pup=v1_aurora",{method:"HEAD"}));
  assert.equal(await head.text(),"");
 }finally{
  globalThis.fetch=before;
 }
});
