import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {invitePreview,lookupInviteUsername} from "../src/friendInvitePreview.js";
import {applyPuppySharePreview} from "../src/puppySharePreview.js";
import middleware from "../middleware.js";
const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const search="?mode=register&invite=PUP-HARLEYTG-DEV";
test("invite metadata is personalized only with validated username; normal account unchanged",()=>{
 const p=invitePreview(search,"HarleyTG");
 assert.equal(p.title,"🐾 @HarleyTG’s Invite to Puppy Clicker");
 assert.equal(p.url,"https://puppy-clicker.vercel.app/account"+search);
 assert.equal(invitePreview("?mode=login&invite=PUP-HARLEYTG-DEV"),null);
 assert.equal(invitePreview("?mode=register&invite=invalid"),null);
 assert.doesNotMatch(invitePreview(search,"<script>").title,/script/);
 assert.doesNotMatch(invitePreview(search+"&username=imposter").title,/imposter/);
 const rendered=applyPuppySharePreview(html,p);
 assert.match(rendered,/og:title" content="🐾 @HarleyTG’s Invite to Puppy Clicker"/);
 assert.match(rendered,/twitter:card" content="summary"/);
 assert.doesNotMatch(rendered,/og:image:width/);
 assert.match(rendered,/script type="module"/);
});
test("server lookup requests only active inviter and public username; invalid/unavailable falls back",async()=>{
 let calls=[];
 const fetcher=async(url,options)=>{
  calls.push({url:new URL(url),options});
  return Response.json(calls.length===1?[{id:"12345678-1234-1234-1234-123456789012"}]:[{username:"HarleyTG"}]);
 };
 const options={url:"https://example.supabase.co",key:"sb_secret_test",fetcher};
 assert.equal(await lookupInviteUsername(search,options),"HarleyTG");
 assert.equal(calls[0].url.searchParams.get("friend_code"),"eq.PUP-HARLEYTG-DEV");
 assert.equal(calls[0].url.searchParams.get("status"),"eq.active");
 assert.equal(calls[1].url.searchParams.get("status"),"eq.active");
 assert.equal(calls[1].url.searchParams.get("select"),"username");
 assert.equal(calls[0].options.headers.apikey,"sb_secret_test");
 assert.equal(await lookupInviteUsername(search,{...options,fetcher:async()=>Response.json([])}),null);
 assert.equal(await lookupInviteUsername(search,{...options,fetcher:async()=>{throw Error("offline")}}),null);
});
test("middleware returns personalized invite HTML and preserves signup application",async()=>{
 const original=globalThis.fetch,oldKey=process.env.SUPABASE_SECRET_KEY;
 process.env.SUPABASE_SECRET_KEY="sb_secret_test";
 globalThis.fetch=async(input)=>{
  const u=new URL(input);
  if(u.pathname.endsWith("/pupeye_players"))return Response.json([{id:"12345678-1234-1234-1234-123456789012"}]);
  if(u.pathname.endsWith("/pup_accounts"))return Response.json([{username:"HarleyTG"}]);
  return new Response(html);
 };
 try{
  const response=await middleware(new Request("https://puppy-clicker.vercel.app/account"+search));
  assert.equal(response.headers.get("X-Robots-Tag"),"noindex, follow");
  assert.match(await response.text(),/@HarleyTG’s Invite to Puppy Clicker/);
  const normal=await middleware(new Request("https://puppy-clicker.vercel.app/account"));
  assert.equal(await normal.text(),html);
 }finally{
  globalThis.fetch=original;
  if(oldKey===undefined)delete process.env.SUPABASE_SECRET_KEY;else process.env.SUPABASE_SECRET_KEY=oldKey;
 }
});
