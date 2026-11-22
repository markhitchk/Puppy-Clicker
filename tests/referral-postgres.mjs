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
  const save={format:"puppy-clicker-cloud-save",version:1,stores:{puppy_clicker_save:{types:{treats:"long",lifetime_treats:"long",legitimate_taps_v7:"long",unlocked_puppies:"string_set"},values:{unlocked_puppies:["classic"],treats:50,lifetime_treats:80,legitimate_taps_v7:taps,unknown_android_field:42}}}};
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

 // Test the production upgrade on top of previous referral receipts.
 await db.exec(`create schema puppy_rarity;
 create table puppy_rarity.config(version bigint);
 insert into puppy_rarity.config values(1);
 create table puppy_rarity.catalog(puppy_id text primary key,rarity text,published boolean,acquisition text);
 insert into puppy_rarity.catalog values ('classic','common',true,'standard'),('cocoa','common',true,'standard'),('santa','epic',true,'event'),('dev_pup','unobtainable',true,'developer');
 create function public.pup_event_settings_public() returns jsonb language sql as 'select ''{"all_events":true,"christmas_2026":true}''::jsonb';`);
 await db.exec(await load("../supabase/migrations/20261122094500_shared_reward_inbox.sql"));
 for(let i=0;i<6;i++){
  const a=await setup("next"+i,100);
  await db.query("insert into puppy_web.pup_registration_sources(account_uuid,source,created_at,registration_method,inviter_account_uuid) values($1,'friend',now()-interval '25 hours','discord',$2)",[a,inviter]);
 }
 const inbox=who=>scalar("select public.pup_reward_inbox($1)",[who]);
 const revision=()=>scalar("select revision::int from puppy_game.pup_account_saves where account_uuid=$1",[inviter]);
 const redeem=async(who,gift,rev)=>scalar("select public.pup_reward_redeem($1,$2,$3)",[who,gift,rev]);
 for(let i=0;i<6;i++){
  const before=await revision();
  assert.equal((await claim(inviter)).queued,1);
  assert.equal((await claim(inviter)).queued,0);
  assert.equal(await revision(),before);
  const notices=await inbox(inviter);assert.equal(notices.length,1);assert.equal(notices[0].claimable,true);
  assert.equal((await inbox(other)).length,0);
  const gift=notices[0].id;
  assert.equal((await redeem(other,gift,1)).status,"REWARD_NOT_FOUND");
  assert.equal((await redeem(inviter,gift,before-1)).status,"CLOUD_SAVE_CONFLICT");
  assert.equal((await redeem(inviter,gift,before)).status,"saved");
  assert.equal((await redeem(inviter,gift,before)).status,"duplicate");
  assert.equal(await revision(),before+1);
  assert.equal((await inbox(inviter)).length,0);
 }
 const final=await scalar("select save_data from puppy_game.pup_account_saves where account_uuid=$1",[inviter]);
 const values=final.stores.puppy_clicker_save.values;
 assert.equal(values.treats,1050);assert.equal(values.upgrade_ticket_common,1);assert.equal(values.bones_v7,5);
 assert.equal(values.pup_coins_v7,10);assert.equal(values.casino_chips_v7,100);
 assert.deepEqual(values.unlocked_puppies,["classic","cocoa"]);assert.equal(values.unknown_android_field,42);
 assert.equal((await status(inviter)).rewarded,7);
 // Advent puppy is queued but not owned until redemption. Private helper is fixture-only.
 const q=await scalar("select puppy_web.queue_one_reward($1,'advent','2026-12-25',25,$2)",[inviter,final]);
 assert.equal((await inbox(inviter)).length,1);
 assert.equal((await redeem(inviter,q,await revision())).label,"Puppy: santa");
 assert.equal((await redeem(inviter,q,await revision())).status,"duplicate");
 await db.exec("set role authenticated");
 await assert.rejects(inbox(inviter),/permission denied/);
 await assert.rejects(redeem(inviter,q,1),/permission denied/);
 await db.exec("reset role");

 // Exercise unified admin and player gift routing against existing exchange
 // wrapper. The underlying legacy exchange engine is a disposable fixture.
 await db.exec(`alter table puppy_rarity.config add column owner_id uuid;
 alter table puppy_exchange.pup_exchange_offers add column state text default 'pending', add column created_at timestamptz default now(), add column expires_at timestamptz default now()+interval '1 day';
 create table puppy_rarity.history(actor uuid,operation_id uuid,action text,puppy_id text,target uuid,reason text,payload jsonb,before_value jsonb,after_value jsonb,catalog_version bigint,primary key(actor,operation_id));
 insert into puppy_exchange.pup_exchange_transfer_policy values ('cocoa',false,true,true,false),('santa',false,true,true,false),('dev_pup',true,false,false,false);
 create or replace function public.pup_exchange_complete(p_offer uuid,p_actor uuid) returns jsonb language plpgsql as $$
 begin
  update puppy_game.pup_account_saves set save_data=jsonb_set(save_data,'{stores,puppy_clicker_save,values,unlocked_puppies}',(save_data#>'{stores,puppy_clicker_save,values,unlocked_puppies}')||to_jsonb(o.offered[1])),revision=revision+1
  from puppy_exchange.pup_exchange_offers o where o.id=p_offer and o.recipient=p_actor and account_uuid=p_actor and o.kind='gift';
  update puppy_exchange.pup_exchange_offers set state='completed' where id=p_offer;
  return jsonb_build_object('offerId',p_offer,'state','completed');
 end $$;`);
 await db.exec(await load("../supabase/migrations/20261119080100_rarity_exchange_gifts.sql"));
 await db.exec(await load("../supabase/migrations/20261122100500_unify_player_admin_gifts.sql"));
 const staff=await setup("staff",0);
 await db.query("update puppy_pupeye.pupeye_players set guild_role='ADMIN' where id=(select player_uuid from puppy_accounts.pup_accounts where id=$1)",[staff]);
 const target=await scalar("select player_uuid from puppy_accounts.pup_accounts where id=$1",[other]);
 const giftOp=id();
 const gift=actor=>scalar("select public.pup_rarity_gift($1,$2,'cocoa',$3,'Test gift')",[actor,target,giftOp]);
 await assert.rejects(gift(inviter),/STAFF_REQUIRED/);
 const queued=await gift(staff);assert.equal(queued.queued,true);
 assert.equal((await gift(staff)).notificationId,queued.notificationId);
 assert.equal(await scalar("select revision::int from puppy_game.pup_account_saves where account_uuid=$1",[other]),1);
 assert.equal((await redeem(other,queued.notificationId,1)).status,"saved");
 assert.equal((await redeem(other,queued.notificationId,1)).status,"duplicate");
 const resourceOp=id();
 const resource=actor=>scalar("select public.pup_admin_resource_gift($1,$2,'upgrade_ticket_rare',1,$3,'Test ticket')",[actor,target,resourceOp]);
 await assert.rejects(resource(inviter),/STAFF_REQUIRED/);
 const ticket=await resource(staff);assert.equal((await resource(staff)).notificationId,ticket.notificationId);
 assert.equal((await inbox(other)).length,1);
 assert.equal((await redeem(other,ticket.notificationId,2)).status,"saved");
 assert.equal(await scalar("select (save_data#>>'{stores,puppy_clicker_save,values,upgrade_ticket_rare}')::int from puppy_game.pup_account_saves where account_uuid=$1",[other]),1);
 const offer=id();
 await db.query("insert into puppy_exchange.pup_exchange_offers(id,sender,recipient,kind,offered) values($1,$2,$3,'gift',array['santa'])",[offer,inviter,other]);
 await assert.rejects(scalar("select public.pup_exchange_complete($1,$2)",[offer,other]),/EXCHANGE_NOTIFICATION_REQUIRED/);
 await scalar("select public.pup_player_gift_inbox_sync($1)",[other]);
 await scalar("select public.pup_player_gift_inbox_sync($1)",[other]);
 assert.equal((await inbox(other)).length,1);
 assert.equal((await inbox(other))[0].id,offer);
 assert.equal((await redeem(inviter,offer,await revision())).status,"REWARD_NOT_FOUND");
 assert.equal((await redeem(other,offer,3)).status,"saved");
 assert.equal((await redeem(other,offer,3)).status,"duplicate");
 assert.equal((await inbox(other)).length,0);
 const trade=id();
 await db.query("insert into puppy_exchange.pup_exchange_offers(id,sender,recipient,kind,offered) values($1,$2,$3,'trade',array['cocoa'])",[trade,inviter,other]);
 assert.equal((await scalar("select public.pup_exchange_complete($1,$2)",[trade,inviter])).state,"completed");
 await db.exec(await load("../supabase/migrations/20261122103000_legacy_native_exchange_compat.sql"));
 const nativeGift=id();
 await db.query("insert into puppy_exchange.pup_exchange_offers(id,sender,recipient,kind,offered) values($1,$2,$3,'gift',array['cocoa'])",[nativeGift,other,inviter]);
 await scalar("select public.pup_player_gift_inbox_sync($1)",[inviter]);
 await assert.rejects(scalar("select public.pup_exchange_complete($1,$2)",[nativeGift,inviter]),/EXCHANGE_NOTIFICATION_REQUIRED/);
 assert.equal((await scalar("select public.pup_exchange_complete_native($1,$2)",[nativeGift,inviter])).state,"completed");
 assert.equal((await inbox(inviter)).length,0);
 await db.exec("set role authenticated");
 await assert.rejects(scalar("select public.pup_exchange_complete_native($1,$2)",[nativeGift,inviter]),/permission denied/);
 await db.exec("reset role");
 console.log("Unified reward inbox, staff permissions, claim-only web gifts, signed legacy compatibility and trade regression tests passed.");


}finally{await db.close();}
