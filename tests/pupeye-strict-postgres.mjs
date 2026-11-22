
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {PGlite} from "@electric-sql/pglite";
const db=new PGlite();
const load=path=>fs.readFile(new URL(path,import.meta.url),"utf8");
const scalar=async(sql,params=[])=>Object.values((await db.query(sql,params)).rows[0])[0];
const id=()=>crypto.randomUUID();
try{
 await db.exec(await load("./fixtures/rarity-db.sql"));
 await db.exec(`
 create schema puppy_web;
 create schema cron;
 create function cron.schedule(text,text,text) returns bigint language sql as 'select 1::bigint';
 alter table puppy_accounts.pup_accounts add column username text, add column created_at timestamptz default now(), add column discord_user_id text;
 create table puppy_game.pup_web_gameplay_operations(account_uuid uuid,operation_id uuid,intent_hash text,intent_type text,created_at timestamptz default now(),primary key(account_uuid,operation_id));
 create table puppy_web.pup_reward_inbox(id uuid primary key,account_uuid uuid,source text,claimed_at timestamptz);
 create table puppy_web.pup_registration_sources(account_uuid uuid,inviter_account_uuid uuid,created_at timestamptz default now());
 create table puppy_pupeye.pupeye_global_bans(id uuid primary key,kind text,status text,expires_at timestamptz,player_uuid uuid);
 -- Disposable stubs model ONLY the existing global-ban API contract.
 create function public.pupeye_create_global_ban(text,text,text,text,timestamptz,text,text,jsonb)
 returns table(ban_uuid uuid) language sql as $$
 insert into puppy_pupeye.pupeye_global_bans values(gen_random_uuid(),$1,'active',$5,($8->0->>'playerUuid')::uuid) returning id
 $$;
 create function public.pupeye_resolve_global_ban(uuid,text,uuid,uuid,text)
 returns table(ban_uuid uuid) language sql as $$
 select id from puppy_pupeye.pupeye_global_bans where player_uuid=$1 and status='active' and (expires_at is null or expires_at>now())
 $$;
 create function public.pupeye_revoke_global_ban(uuid,text,text) returns void language sql as $$
 update puppy_pupeye.pupeye_global_bans set status='revoked' where id=$1
 $$;
 `);
 await db.exec(await load("../supabase/migrations/20261105011336_pupeye_web_fairplay.sql"));
 await db.exec(await load("../supabase/migrations/20261122102500_pupeye_web_strict.sql"));
 async function account(name,role="PLAYER"){
  const a=id(),p=id();
  await db.query("insert into puppy_accounts.pup_accounts(id,player_uuid,status,username) values($1,$2,'active',$3)",[a,p,name]);
  await db.query("insert into puppy_pupeye.pupeye_players values($1,$2,'active')",[p,role]);
  return {a,p};
 }
 const cheater=await account("fixture"),recipient=await account("recipient"),staff=await account("staff","ADMIN"),clean=await account("clean");
 const hash="a".repeat(64),otherHash="b".repeat(64);
 const integrity=(actor,kind,ref,h=null)=>scalar("select public.pupeye_web_strict_integrity($1,$2,$3,$4)",[actor.a,kind,ref,h]);
 const count=actor=>scalar("select count(*)::int from puppy_pupeye.web_strict_evidence where account_uuid=$1",[actor.a]);
 const bans=actor=>scalar("select count(*)::int from puppy_pupeye.pupeye_global_bans where player_uuid=$1",[actor.p]);
 const overview=()=>scalar("select public.pupeye_web_strict_overview()");
 async function receipt(actor){
  const op=id();
  await db.query("insert into puppy_game.pup_web_gameplay_operations(account_uuid,operation_id,intent_hash,intent_type) values($1,$2,$3,'tap')",[actor.a,op,hash]);
  return op;
 }
 async function gift(actor){
  const g=id();
  await db.query("insert into puppy_web.pup_reward_inbox values($1,$2,'player',null)",[g,actor.a]);
  return g;
 }
 await integrity(cheater,"receipt",id(),otherHash);
 await integrity(cheater,"gift",id());
 const first=await receipt(cheater);
 await integrity(cheater,"receipt",first,hash); // legitimate replay
 await integrity(cheater,"gift",await gift(cheater)); // legitimate own gift
 assert.equal(await count(cheater),0);
 await integrity(cheater,"receipt",first,otherHash);
 await integrity(cheater,"receipt",first,otherHash); // dedup
 assert.equal(await count(cheater),1);
 await integrity(cheater,"receipt",await receipt(cheater),otherHash);
 await integrity(cheater,"receipt",await receipt(cheater),otherHash);
 for(let i=0;i<2;i++)await integrity(cheater,"gift",await gift(recipient));
 assert.equal(await bans(cheater),0);
 await integrity(cheater,"gift",await gift(recipient));
 assert.equal(await bans(cheater),1);
 const suspension=await scalar("select id from puppy_pupeye.pupeye_global_bans where player_uuid=$1",[cheater.p]);
 assert.equal(await scalar("select kind from puppy_pupeye.pupeye_global_bans where id=$1",[suspension]),"temporary");
 assert.equal((await overview()).players.find(p=>p.id===cheater.a).enforcement.kind,"temporary");
 // Simulate expired suspension and reviewed evidence without wall-clock delay.
 await db.query("update puppy_pupeye.web_strict_evidence set created_at=now()-interval '2 days' where account_uuid=$1",[cheater.a]);
 await db.query("update puppy_pupeye.pupeye_global_bans set expires_at=now()-interval '1 hour' where id=$1",[suspension]);
 await db.query("update puppy_pupeye.web_fairplay_cases set status='confirmed',reviewed_by=$2,reviewed_at=now()-interval '2 hours' where account_uuid=$1 and signal='OPERATION_TAMPER'",[cheater.a,staff.p]);
 for(let i=0;i<3;i++)await integrity(cheater,"receipt",await receipt(cheater),otherHash);
 for(let i=0;i<3;i++)await integrity(cheater,"gift",await gift(recipient));
 assert.equal(await bans(cheater),2);
 const permanent=(await overview()).players.find(p=>p.id===cheater.a).enforcement;
 assert.equal(permanent.kind,"permanent");
 await assert.rejects(scalar("select public.pupeye_web_strict_lift($1,$2,'Not staff')",[clean.p,permanent.banId]),/STAFF_ACCESS_REQUIRED/);
 assert.equal((await scalar("select public.pupeye_web_strict_lift($1,$2,'Appeal reviewed; false positive')",[staff.p,permanent.banId])).revoked,true);
 assert.equal((await overview()).players.find(p=>p.id===cheater.a).enforcement,null);
 // Review-only evidence can never cause a global ban.
 for(let i=0;i<12;i++)await db.query("insert into puppy_web.pup_registration_sources values($1,$2,now())",[id(),clean.a]);
 await scalar("select public.pupeye_web_strict_scan($1,'reward')",[clean.a]);
 assert.equal(await count(clean),1);assert.equal(await bans(clean),0);
 for(let i=0;i<3;i++){await integrity(staff,"receipt",await receipt(staff),otherHash);await integrity(staff,"gift",await gift(recipient));}
 assert.equal(await bans(staff),0);
 await db.exec("set role authenticated");
 await assert.rejects(overview(),/permission denied/);
 await assert.rejects(integrity(clean,"gift",id()),/permission denied/);
 await db.exec("reset role");
 console.log("PupEye strict evidence deduplication, automatic escalation, staff exemptions, appeal reversal and service-role isolation passed.");
}finally{await db.close();}
