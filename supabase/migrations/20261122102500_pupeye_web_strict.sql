
-- PupEye Web V2. Server-only telemetry, bounded evidence, and reversible sanctions.
-- No hardware fingerprint, IP-only sanction, or browser-supplied proof of cheating.
create table puppy_pupeye.web_strict_evidence(
 account_uuid uuid not null references puppy_accounts.pup_accounts(id) on delete cascade,
 signal text not null check(signal in ('OPERATION_TAMPER','FOREIGN_GIFT_PROBE','SUSTAINED_AUTOMATION_PATTERN','REFERRAL_BURST','REWARD_BURST')),
 reference text not null check(length(reference)<=80),
 case_id bigint references puppy_pupeye.web_fairplay_cases(id) on delete set null,
 created_at timestamptz not null default now(),
 primary key(account_uuid,signal,reference)
);
create index web_strict_evidence_recent on puppy_pupeye.web_strict_evidence(account_uuid,created_at desc);
create table puppy_pupeye.web_strict_enforcement(
 id bigint generated always as identity primary key,
 account_uuid uuid references puppy_accounts.pup_accounts(id) on delete set null,
 ban_uuid uuid not null unique references puppy_pupeye.pupeye_global_bans(id),
 kind text not null check(kind in ('temporary','permanent')),
 evidence_summary jsonb not null,
 created_at timestamptz not null default now(),
 lifted_at timestamptz,
 lifted_by uuid,
 lift_note text
);
alter table puppy_pupeye.web_strict_evidence enable row level security;
alter table puppy_pupeye.web_strict_enforcement enable row level security;
revoke all on puppy_pupeye.web_strict_evidence,puppy_pupeye.web_strict_enforcement from public,anon,authenticated,service_role;
revoke all on sequence puppy_pupeye.web_strict_enforcement_id_seq from public,anon,authenticated,service_role;

-- One strict signal from a committed server observation. Independent receipts,
-- not requests or client clocks, are the source of evidence.
create function puppy_pupeye.strict_note(p_account uuid,p_signal text,p_reference text,p_detail jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare inserted boolean; c bigint; row_count_recent integer; kinds integer; prior_review timestamptz; prior_suspension timestamptz; player uuid; role_code text; discord_id text; ban_id uuid; ban_kind text; expiry timestamptz; recent_after integer; kinds_after integer; recent_since timestamptz;
begin
 perform pg_advisory_xact_lock(hashtextextended('pupeye-strict:'||p_account::text,0));
 select a.player_uuid,p.guild_role,a.discord_user_id into player,role_code,discord_id from puppy_accounts.pup_accounts a join puppy_pupeye.pupeye_players p on p.id=a.player_uuid
 where a.id=p_account and a.status='active' and p.status='active';
 if not found then return; end if;
 insert into puppy_pupeye.web_strict_evidence(account_uuid,signal,reference) values(p_account,p_signal,p_reference) on conflict do nothing;
 if not found then return; end if;
 insert into puppy_pupeye.web_fairplay_cases(account_uuid,signal,severity,weight,score_after,evidence)
 values(p_account,p_signal,case when p_signal in ('OPERATION_TAMPER','FOREIGN_GIFT_PROBE') then 'high' else 'warning' end,0,
 coalesce((select risk_score from puppy_pupeye.web_fairplay_profiles where account_uuid=p_account),0),p_detail||jsonb_build_object('source','server_verified','v2',true))
 returning id into c;
 update puppy_pupeye.web_strict_evidence set case_id=c where account_uuid=p_account and signal=p_signal and reference=p_reference;
 -- Behavior, shared networks, repeated legitimate claims and advisory client
 -- timing never independently create global bans. Staff accounts are review-only.
 if p_signal not in ('OPERATION_TAMPER','FOREIGN_GIFT_PROBE') or coalesce(role_code,'GUEST') not in ('PUP_MEMBER','GUEST') then return; end if;
 if exists(select 1 from public.pupeye_resolve_global_ban(player,discord_id,null,null,null)) then return; end if;
 -- Only distinct, independently verified targets count; known false positives do not.
 select count(*),count(distinct e.signal) into row_count_recent,kinds
 from puppy_pupeye.web_strict_evidence e join puppy_pupeye.web_fairplay_cases f on f.id=e.case_id
 where e.account_uuid=p_account and e.signal in ('OPERATION_TAMPER','FOREIGN_GIFT_PROBE') and f.status<>'dismissed' and e.created_at>now()-interval '24 hours';
 select max(f.reviewed_at) into prior_review from puppy_pupeye.web_fairplay_cases f
 where f.account_uuid=p_account and f.signal in ('OPERATION_TAMPER','FOREIGN_GIFT_PROBE') and f.status='confirmed' and f.reviewed_by is not null and f.reviewed_at>now()-interval '90 days';
 select max(b.expires_at) into prior_suspension from puppy_pupeye.web_strict_enforcement e join puppy_pupeye.pupeye_global_bans b on b.id=e.ban_uuid
 where e.account_uuid=p_account and e.kind='temporary' and e.lifted_at is null and b.status in ('active','expired') and b.expires_at<=now() and b.expires_at>now()-interval '90 days';
 recent_since:=greatest(prior_review,prior_suspension);
 -- Permanent escalation requires a completed prior automatic suspension,
 -- a human-confirmed abuse case, and fresh evidence of BOTH classes afterward.
 if prior_review is not null and prior_suspension is not null then
  select count(*),count(distinct e.signal) into recent_after,kinds_after from puppy_pupeye.web_strict_evidence e join puppy_pupeye.web_fairplay_cases f on f.id=e.case_id
  where e.account_uuid=p_account and e.signal in ('OPERATION_TAMPER','FOREIGN_GIFT_PROBE') and e.created_at>recent_since and f.status<>'dismissed';
  if recent_after>=6 and kinds_after=2 then ban_kind:='permanent'; end if;
 end if;
 if ban_kind is null and row_count_recent>=6 and kinds=2 then ban_kind:='temporary'; expiry:=now()+interval '24 hours'; end if;
 if ban_kind is null then return; end if;
 select b.ban_uuid into ban_id from public.pupeye_create_global_ban(ban_kind,'PUPEYE_WEB_STRICT',
  case ban_kind when 'permanent' then 'Repeated verified gameplay or reward integrity abuse. Contact support to request review.' else 'Verified gameplay or reward integrity abuse. Temporary restriction pending review.' end,
  'PupEye Web V2: corroborated integrity evidence; case '||c::text,expiry,'pupeye_web:v2',null,
  jsonb_build_array(jsonb_build_object('type','PLAYER','playerUuid',player))) b;
 insert into puppy_pupeye.web_strict_enforcement(account_uuid,ban_uuid,kind,evidence_summary)
 values(p_account,ban_id,ban_kind,jsonb_build_object('caseId',c,'recentDistinct',row_count_recent,'classes',kinds,'afterPriorSuspension',recent_after,'confirmedReviewAt',prior_review));
 insert into puppy_pupeye.web_fairplay_cases(account_uuid,signal,severity,score_after,evidence)
 values(p_account,'STRICT_AUTOMATIC_ENFORCEMENT','restriction',0,jsonb_build_object('source','server_verified','kind',ban_kind,'banId',ban_id,'expiresAt',expiry,'caseId',c));
end $$;
revoke all on function puppy_pupeye.strict_note(uuid,text,text,jsonb) from public,anon,authenticated,service_role;

-- Re-query the authoritative records: client-chosen IDs alone are not proof.
create function public.pupeye_web_strict_integrity(p_account uuid,p_kind text,p_id uuid,p_hash text default null)
returns void language plpgsql security definer set search_path='' as $$
begin
 if p_kind='receipt' then
  if p_hash ~ '^[0-9a-f]{64}$' and exists(select 1 from puppy_game.pup_web_gameplay_operations o where o.account_uuid=p_account and o.operation_id=p_id and o.intent_hash<>p_hash) then
   perform puppy_pupeye.strict_note(p_account,'OPERATION_TAMPER',p_id::text,jsonb_build_object('receiptMismatch',true));
  end if;
 elsif p_kind='gift' then
  if exists(select 1 from puppy_web.pup_reward_inbox q where q.id=p_id and q.account_uuid<>p_account and q.claimed_at is null) then
   perform puppy_pupeye.strict_note(p_account,'FOREIGN_GIFT_PROBE',p_id::text,jsonb_build_object('recipientMismatch',true));
  end if;
 end if;
end $$;

-- Rate/regularity based on COMMITTED tap receipts, not JS timestamps. Queue
-- scheduling can itself create regular intervals, so this remains review-only.
create function public.pupeye_web_strict_scan(p_account uuid,p_kind text)
returns void language plpgsql security definer set search_path='' as $$
declare n integer; elapsed numeric; cv numeric; referrals integer; rewards integer; window_ref text:=floor(extract(epoch from now())/3600)::text;
begin
 if p_kind='tap' then
  with taps as (select created_at from puppy_game.pup_web_gameplay_operations where account_uuid=p_account and intent_type='tap' and created_at>now()-interval '15 minutes'),
  gaps as (select extract(epoch from(created_at-lag(created_at) over(order by created_at))) as gap from taps)
  select count(gap),sum(gap),stddev_pop(gap)/nullif(avg(gap),0) into n,elapsed,cv from gaps;
  if n>=1000 and elapsed>=600 and (n/nullif(elapsed,0)>=5 or cv<0.10) then
   perform puppy_pupeye.strict_note(p_account,'SUSTAINED_AUTOMATION_PATTERN',window_ref,jsonb_build_object('acceptedTaps',n+1,'durationSeconds',round(elapsed),'intervalVariation',round(cv,4),'reviewOnly',true));
  end if;
 elsif p_kind='reward' then
  select count(*) into referrals from puppy_web.pup_registration_sources where inviter_account_uuid=p_account and created_at>now()-interval '24 hours';
  select count(*) into rewards from puppy_web.pup_reward_inbox where account_uuid=p_account and source in ('referral','player') and claimed_at>now()-interval '24 hours';
  if referrals>=10 then perform puppy_pupeye.strict_note(p_account,'REFERRAL_BURST',window_ref,jsonb_build_object('attributedSignups24h',referrals,'reviewOnly',true)); end if;
  if rewards>=20 then perform puppy_pupeye.strict_note(p_account,'REWARD_BURST',window_ref,jsonb_build_object('claimedGifts24h',rewards,'reviewOnly',true)); end if;
 end if;
end $$;

-- Admin overview includes accounts with zero incidents, not just flagged cases.
create function public.pupeye_web_strict_overview()
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('players',coalesce(jsonb_agg(to_jsonb(t) order by t.risk_score desc,t.username),'[]'::jsonb))
 from (select a.id,a.username,coalesce(f.risk_score,0) risk_score,f.restricted_until,f.updated_at,
  coalesce(f.window_taps,0) window_taps,coalesce(f.window_rejected,0) window_rejected,
  (select count(*) from puppy_pupeye.web_fairplay_cases c where c.account_uuid=a.id and c.status='open') open_cases,
  (select count(*) from puppy_pupeye.web_strict_evidence e where e.account_uuid=a.id and e.created_at>now()-interval '24 hours') strict_signals_24h,
  (select count(*) from puppy_web.pup_reward_inbox q where q.account_uuid=a.id and q.claimed_at>now()-interval '24 hours') gifts_claimed_24h,
  (select count(*) from puppy_web.pup_registration_sources s where s.inviter_account_uuid=a.id and s.created_at>now()-interval '24 hours') referrals_24h,
  (select jsonb_build_object('kind',e.kind,'banId',e.ban_uuid,'expiresAt',b.expires_at) from puppy_pupeye.web_strict_enforcement e join puppy_pupeye.pupeye_global_bans b on b.id=e.ban_uuid where e.account_uuid=a.id and b.status='active' and (b.expires_at is null or b.expires_at>now()) order by e.created_at desc limit 1) enforcement
 from puppy_accounts.pup_accounts a left join puppy_pupeye.web_fairplay_profiles f on a.id=f.account_uuid where a.status='active' order by a.created_at desc limit 100) t
$$;

-- Staff override is restricted to authenticated staff at the API AND database.
create function public.pupeye_web_strict_lift(p_actor uuid,p_ban uuid,p_note text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare e puppy_pupeye.web_strict_enforcement%rowtype; actor_player uuid; target_player uuid; target_role text;
begin
 select p.id into actor_player from puppy_pupeye.pupeye_players p join puppy_accounts.pup_accounts a on a.player_uuid=p.id
 where p.id=p_actor and p.status='active' and a.status='active' and p.guild_role in ('ADMIN','DEVELOPER');
 if not found then raise exception 'STAFF_ACCESS_REQUIRED'; end if;
 if coalesce(length(trim(p_note)),0) not between 5 and 500 then raise exception 'FAIRPLAY_REVIEW_INVALID'; end if;
 select * into e from puppy_pupeye.web_strict_enforcement where ban_uuid=p_ban;
 if not found or e.account_uuid is null then raise exception 'BAN_NOT_FOUND'; end if;
 perform pg_advisory_xact_lock(hashtextextended('pupeye-strict:'||e.account_uuid::text,0));
 select * into e from puppy_pupeye.web_strict_enforcement where ban_uuid=p_ban for update;
 if e.lifted_at is not null then return jsonb_build_object('revoked',true,'unchanged',true); end if;
 select a.player_uuid,p.guild_role into target_player,target_role from puppy_accounts.pup_accounts a join puppy_pupeye.pupeye_players p on p.id=a.player_uuid where a.id=e.account_uuid;
 if target_player is null or target_player=actor_player or target_role in ('ADMIN','DEVELOPER') then raise exception 'CANNOT_SANCTION_STAFF'; end if;
 perform public.pupeye_revoke_global_ban(p_ban,'web_admin:'||actor_player::text,trim(p_note));
 update puppy_pupeye.web_strict_enforcement set lifted_at=now(),lifted_by=actor_player,lift_note=trim(p_note) where ban_uuid=p_ban;
 update puppy_pupeye.web_fairplay_cases set status='dismissed',reviewed_at=now(),reviewed_by=actor_player,review_note='Enforcement lifted: '||trim(p_note)
 where account_uuid=e.account_uuid and signal in ('OPERATION_TAMPER','FOREIGN_GIFT_PROBE') and status<>'dismissed';
 update puppy_pupeye.web_fairplay_profiles set risk_score=0,restricted_until=null,prior_high_windows=0 where account_uuid=e.account_uuid;
 insert into puppy_admin.pup_admin_actions(actor_player_uuid,target_player_uuid,action_code,detail) values(actor_player,target_player,'WEB_STRICT_BAN_LIFTED',jsonb_build_object('banId',p_ban,'note',trim(p_note)));
 return jsonb_build_object('revoked',true);
end $$;

create function public.pupeye_web_strict_prune() returns void language sql security definer set search_path='' as $$
 delete from puppy_pupeye.web_strict_evidence where created_at<now()-interval '90 days'
$$;
revoke all on function public.pupeye_web_strict_integrity(uuid,text,uuid,text),public.pupeye_web_strict_scan(uuid,text),public.pupeye_web_strict_overview(),public.pupeye_web_strict_lift(uuid,uuid,text),public.pupeye_web_strict_prune() from public,anon,authenticated;
grant execute on function public.pupeye_web_strict_integrity(uuid,text,uuid,text),public.pupeye_web_strict_scan(uuid,text),public.pupeye_web_strict_overview(),public.pupeye_web_strict_lift(uuid,uuid,text),public.pupeye_web_strict_prune() to service_role;
select cron.schedule('puppy-pupeye-strict-daily-cleanup','25 3 * * *','select public.pupeye_web_strict_prune()');

-- Keep eligibility consistent with global sanctions, including suspended invitees
-- whose account status itself remains active so the ban notice is viewable.
create or replace function puppy_web.referral_rows(p_inviter uuid)
returns table(invited_id uuid,username text,joined_at timestamptz,progress text,paid integer)
language sql stable security definer set search_path='' as $$
 select a.id,a.username::text,r.created_at,
 case when rr.invited_account_uuid is not null then 'rewarded'
 when a.status <> 'active' or p.status is distinct from 'active' or exists(
  select 1 from public.pupeye_resolve_global_ban(a.player_uuid,a.discord_user_id,null,null,null)) then 'ineligible'
 when r.created_at<=now()-interval '24 hours' and s.origin_platform='web' and s.installation_uuid is null
 and case when jsonb_typeof(s.save_data#>'{stores,puppy_clicker_save,values,legitimate_taps_v7}')='number'
 then (s.save_data#>>'{stores,puppy_clicker_save,values,legitimate_taps_v7}')::numeric>=100 else false end then 'ready' else 'pending' end,
 coalesce(rr.treats,0)
 from puppy_web.pup_registration_sources r
 join puppy_accounts.pup_accounts a on a.id=r.account_uuid
 left join puppy_pupeye.pupeye_players p on p.id=a.player_uuid
 left join puppy_game.pup_account_saves s on s.account_uuid=a.id and s.player_uuid=a.player_uuid
 left join puppy_web.pup_referral_rewards rr on rr.invited_account_uuid=a.id
 where r.inviter_account_uuid=p_inviter and a.id<>p_inviter and r.registration_method in ('password','discord')
$$;
revoke all on function puppy_web.referral_rows(uuid) from public,anon,authenticated,service_role;

-- Revalidate both parties before a new transfer; previously redeemed receipts
-- remain idempotent and must not be retroactively removed.
alter function public.pup_reward_redeem(uuid,uuid,bigint) rename to pup_reward_redeem_checked;
alter function public.pup_reward_redeem_checked(uuid,uuid,bigint) set schema puppy_web;
revoke all on function puppy_web.pup_reward_redeem_checked(uuid,uuid,bigint) from public,anon,authenticated,service_role;
create function public.pup_reward_redeem(p_account uuid,p_id uuid,p_revision bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare q puppy_web.pup_reward_inbox%rowtype; participant uuid;
begin
 if exists(select 1 from puppy_accounts.pup_accounts a where a.id=p_account and exists(select 1 from public.pupeye_resolve_global_ban(a.player_uuid,a.discord_user_id,null,null,null))) then return jsonb_build_object('status','PUP_ACCOUNT_BLOCKED'); end if;
 select * into q from puppy_web.pup_reward_inbox where id=p_id and account_uuid=p_account;
 if found and q.claimed_at is null and q.source in ('referral','player') then
  participant:=case when q.source='referral' then q.source_key::uuid else q.sender_account_uuid end;
  if not exists(select 1 from puppy_accounts.pup_accounts a join puppy_pupeye.pupeye_players p on p.id=a.player_uuid where a.id=participant and a.status='active' and p.status='active' and not exists(select 1 from public.pupeye_resolve_global_ban(a.player_uuid,a.discord_user_id,null,null,null))) then
   return jsonb_build_object('status','REWARD_GIFT_INELIGIBLE');
  end if;
 end if;
 return puppy_web.pup_reward_redeem_checked(p_account,p_id,p_revision);
end $$;
revoke all on function public.pup_reward_redeem(uuid,uuid,bigint) from public,anon,authenticated;
grant execute on function public.pup_reward_redeem(uuid,uuid,bigint) to service_role;

notify pgrst,'reload schema';
