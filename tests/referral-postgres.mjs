import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {PGlite} from "@electric-sql/pglite";
const db=new PGlite();
const load=path=>fs.readFile(new URL(path,import.meta.url),"utf8");
try{
 await db.exec(await load("./fixtures/rarity-db.sql"));
 await db.exec("create schema puppy_web; alter table puppy_accounts.pup_accounts add column username text; alter table puppy_game.pup_account_saves add column origin_platform text, add column installation_uuid uuid;");
 await db.exec(await load("../supabase/migrations/20261104162300_web_registration_sources.sql"));
 await db.exec(await load("../supabase/migrations/20261122093000_invite_referral_rewards.sql"));
 const id=()=>crypto.randomUUID();
 async function setup(username,taps,status="active"){
  const a=id(),p=id();
  await db.query("insert into puppy_accounts.pup_accounts(id,player_uuid,status,username) values($1,$2,$3,$4)",[a,p,status,username]);
  await db.query("insert into puppy_pupeye.pupeye_players values($1,'PLAYER',$2)",[p,status]);
  const save={format:"puppy-clicker-cloud-save",version:1,stores:{puppy_clicker_save:{types:{treats:"long",lifetime_treats:"long",legitimate_taps_v7:"long"},values:{treats:50,lifetime_treats:80,legitimate_taps_v7:taps,unknown_android_field:42}}}};
  await db.query("insert into puppy_game.pup_account_saves(player_uuid,account_uuid,revision,save_data,updated_at,origin_platform) values($1,$2,1,$3,now(),'web')",[p,a,save]);
  return a;
 }
 const inviter=await setup("inviter",0),other=await setup("other",0),ready=await setup("ready",100),young=await setup("young",100),few=await setup("few",99),blocked=await setup("blocked",100,"blocked"),manual=await setup("manual",100);
 for(const [account,hours,owner] of [[ready,25,inviter],[young,1,inviter],[few,25,inviter],[blocked,25,inviter],[manual,25,null]]){
  await db.query("insert into puppy_web.pup_registration_sources(account_uuid,source,created_at,registration_method,inviter_account_uuid) values($1,'friend',now()-($2::int * interval '1 hour'),'password',$3)",[account,hours,owner]);
 }
 const scalar=async(sql,params=[])=>Object.values((await db.query(sql,params)).rows[0])[0];
 const status=who=>scalar("select public.pup_referral_status($1)",[who]);
 const claim=who=>scalar("select public.pup_referral_claim($1)",[who]);
 const initial=await status(inviter);
 assert.equal(initial.total,4);assert.equal(initial.ready,1);assert.equal(initial.pending,2);
 assert.equal(initial.history.find(r=>r.username==="blocked").status,"ineligible");
 assert.equal((await status(other)).total,0);
 await db.exec("set role authenticated");
 await assert.rejects(status(inviter),/permission denied/);
 await assert.rejects(claim(inviter),/permission denied/);
 await db.exec("reset role");
 // A failed ledger write cannot leave a balance increment.
 await db.exec("alter table puppy_web.pup_referral_rewards add constraint test_fail check(treats<500)");
 await assert.rejects(claim(inviter),/test_fail/);
 assert.equal(await scalar("select revision::int from puppy_game.pup_account_saves where account_uuid=$1",[inviter]),1);
 await db.exec("alter table puppy_web.pup_referral_rewards drop constraint test_fail");
 assert.equal((await claim(inviter)).treats,500);
 assert.equal((await claim(inviter)).claimed,0);
 const save=await scalar("select save_data from puppy_game.pup_account_saves where account_uuid=$1",[inviter]);
 assert.equal(save.stores.puppy_clicker_save.values.treats,550);
 assert.equal(save.stores.puppy_clicker_save.values.lifetime_treats,580);
 assert.equal(save.stores.puppy_clicker_save.values.unknown_android_field,42);
 assert.equal((await status(inviter)).earned,500);
 assert.equal((await status(inviter)).rewarded,1);
 console.log("Referral attribution, eligibility, privacy grants, rollback and replay tests passed.");
}finally{await db.close();}
