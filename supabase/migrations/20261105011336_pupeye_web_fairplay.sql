-- PupEye Web fair-play: server-owned evidence and review-only incident decisions.
-- This migration touches Puppy Clicker tables only, never other projects.
create table if not exists puppy_pupeye.web_fairplay_profiles (
 account_uuid uuid primary key references puppy_accounts.pup_accounts(id) on delete cascade,
 window_started timestamptz not null default clock_timestamp(),
 window_taps integer not null default 0,
 window_rejected integer not null default 0,
 volume_stage smallint not null default 0,
 reject_stage smallint not null default 0,
 regularity_noted boolean not null default false,
 prior_high_windows smallint not null default 0,
 risk_score integer not null default 0,
 restricted_until timestamptz,
 updated_at timestamptz not null default clock_timestamp(),
 constraint fairplay_score_range check (risk_score between 0 and 250)
);
create table if not exists puppy_pupeye.web_fairplay_cases (
 id bigint generated always as identity primary key,
 account_uuid uuid not null references puppy_accounts.pup_accounts(id) on delete cascade,
 signal text not null,
 severity text not null check(severity in ('advisory','warning','high','restriction')),
 weight integer not null default 0,
 score_after integer not null default 0,
 evidence jsonb not null default '{}'::jsonb,
 status text not null default 'open' check(status in ('open','confirmed','dismissed')),
 created_at timestamptz not null default clock_timestamp(),
 reviewed_at timestamptz,
 reviewed_by uuid,
 review_note text
);
create index if not exists puppy_fairplay_cases_open_idx
 on puppy_pupeye.web_fairplay_cases(status,created_at desc);
create index if not exists puppy_fairplay_cases_account_idx
 on puppy_pupeye.web_fairplay_cases(account_uuid,created_at desc);
alter table puppy_pupeye.web_fairplay_profiles enable row level security;
alter table puppy_pupeye.web_fairplay_cases enable row level security;
revoke all on puppy_pupeye.web_fairplay_profiles from public,anon,authenticated;
revoke all on puppy_pupeye.web_fairplay_cases from public,anon,authenticated;
revoke all on sequence puppy_pupeye.web_fairplay_cases_id_seq from public,anon,authenticated;
comment on table puppy_pupeye.web_fairplay_cases is
 'Server-observed fair-play evidence and advisory browser signals. No automated global bans. Reviewable, 90-day case retention.';

create or replace function public.pupeye_web_fairplay_status(p_account_uuid uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $f$
declare v_profile puppy_pupeye.web_fairplay_profiles%rowtype;
        v_now timestamptz := clock_timestamp();
        v_score integer := 0; v_status text := 'clear';
begin
 select * into v_profile from puppy_pupeye.web_fairplay_profiles where account_uuid=p_account_uuid;
 if found then
  v_score:=greatest(0,v_profile.risk_score-
   greatest(0,floor(extract(epoch from (v_now-v_profile.updated_at))/900)::integer)*10);
  if v_profile.restricted_until > v_now then v_status:='restricted';
  elsif v_score>=25 then v_status:='warning';
  end if;
 end if;
 return pg_catalog.jsonb_build_object(
  'status',v_status,
  'restrictedUntil',case when v_status='restricted' then v_profile.restricted_until else null end,
  'message',case v_status
   when 'restricted' then 'PupEye has temporarily paused tapping due to unusual sustained activity. You can continue other gameplay and request a review.'
   when 'warning' then 'PupEye noticed unusually intense tapping. Please use normal manual play. This is not a ban.'
   else null end);
end;
$f$;

create or replace function public.pupeye_web_fairplay_record(
 p_account_uuid uuid,p_signal text,p_observation jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = ''
as $f$
declare v_state puppy_pupeye.web_fairplay_profiles%rowtype;
        v_now timestamptz := clock_timestamp();
        v_steps integer := 0; v_stage smallint; v_rej_stage smallint;
        v_repeats smallint; v_taps integer; v_rejected integer;
        v_score integer; v_delta integer := 0; v_signal text; v_severity text;
        v_case_id bigint; v_hold timestamptz;
        v_regular boolean; v_cv numeric; v_samples integer; v_window_ms integer;
begin
 if p_signal not in ('tap_accepted','tap_rate_rejected','client_regular_timing') then
  raise exception 'FAIRPLAY_SIGNAL_INVALID';
 end if;
 if not exists(select 1 from puppy_accounts.pup_accounts where id=p_account_uuid and status='active') then
  raise exception 'FAIRPLAY_ACCOUNT_UNAVAILABLE';
 end if;
 insert into puppy_pupeye.web_fairplay_profiles(account_uuid)
 values(p_account_uuid) on conflict(account_uuid) do nothing;
 select * into v_state from puppy_pupeye.web_fairplay_profiles
 where account_uuid=p_account_uuid for update;
 v_steps:=greatest(0,floor(extract(epoch from(v_now-v_state.window_started))/300)::integer);
 v_stage:=case when v_steps=0 then v_state.volume_stage else 0 end;
 v_rej_stage:=case when v_steps=0 then v_state.reject_stage else 0 end;
 v_regular:=case when v_steps=0 then v_state.regularity_noted else false end;
 v_taps:=case when v_steps=0 then v_state.window_taps else 0 end;
 v_rejected:=case when v_steps=0 then v_state.window_rejected else 0 end;
 v_repeats:=case
  when v_steps=0 then v_state.prior_high_windows
  when v_steps=1 and v_state.volume_stage>=2 then least(10,v_state.prior_high_windows+1)
  else 0 end;
 v_score:=greatest(0,v_state.risk_score-
  greatest(0,floor(extract(epoch from (v_now-v_state.updated_at))/900)::integer)*10);
 v_hold:=v_state.restricted_until;
 if p_signal='tap_accepted' then
  v_taps:=v_taps+1;
  if v_taps>=2200 and v_stage<3 then
   v_stage:=3;v_delta:=40;v_signal:='EXTREME_TAP_VOLUME';v_severity:='high';
  elsif v_taps>=1600 and v_stage<2 then
   v_stage:=2;v_delta:=25;v_signal:='SUSTAINED_TAP_VOLUME';v_severity:='warning';
  elsif v_taps>=1100 and v_stage<1 then
   v_stage:=1;v_delta:=5;v_signal:='HIGH_TAP_VOLUME';v_severity:='advisory';
  end if;
 elsif p_signal='tap_rate_rejected' then
  v_rejected:=v_rejected+1;
  if v_rejected>=100 and v_rej_stage<3 then
   v_rej_stage:=3;v_delta:=30;v_signal:='REPEATED_RATE_REJECTION';v_severity:='high';
  elsif v_rejected>=40 and v_rej_stage<2 then
   v_rej_stage:=2;v_delta:=12;v_signal:='BURST_RATE_REJECTION';v_severity:='warning';
  elsif v_rejected>=12 and v_rej_stage<1 then
   v_rej_stage:=1;v_delta:=5;v_signal:='TAP_RATE_REJECTION';v_severity:='advisory';
  end if;
 elsif p_signal='client_regular_timing' and not v_regular then
  -- Browser timing is advisory and spoofable. It can NEVER trigger a restriction alone.
  v_samples:=least(2000,greatest(0,coalesce((p_observation->>'sampleCount')::integer,0)));
  v_window_ms:=least(120000,greatest(0,coalesce((p_observation->>'windowMs')::integer,0)));
  v_cv:=greatest(0,least(10,coalesce((p_observation->>'coefficientVariation')::numeric,1)));
  if v_samples>=80 and v_window_ms>=15000 and v_cv<0.075 then
   v_regular:=true;v_signal:='CLIENT_TIMING_ADVISORY';v_severity:='advisory';v_delta:=0;
  end if;
 end if;
 v_score:=least(250,v_score+v_delta);
 if v_signal is not null then
  insert into puppy_pupeye.web_fairplay_cases(account_uuid,signal,severity,weight,score_after,evidence)
   values(p_account_uuid,v_signal,v_severity,v_delta,v_score,
    case when v_signal='CLIENT_TIMING_ADVISORY'
     then pg_catalog.jsonb_build_object('sampleCount',v_samples,'windowMs',v_window_ms,
      'coefficientVariation',v_cv,'source','browser_advisory')
     else pg_catalog.jsonb_build_object('windowTaps',v_taps,'windowRejections',v_rejected,
      'consecutiveHighWindows',v_repeats,'source','server_received') end)
   returning id into v_case_id;
 end if;
 -- Only repeated, extreme server-observed tapping over consecutive five-minute windows
 -- can temporarily hold tapping. Never globally ban or block care/account access.
 if p_signal='tap_accepted' and v_stage>=2 and v_repeats>=2
    and v_score>=100 and (v_hold is null or v_hold<=v_now) then
  v_hold:=v_now+interval '5 minutes';
  insert into puppy_pupeye.web_fairplay_cases(account_uuid,signal,severity,weight,score_after,evidence)
   values(p_account_uuid,'TEMPORARY_TAP_HOLD','restriction',0,v_score,
    pg_catalog.jsonb_build_object('durationMinutes',5,'source','server_received',
     'consecutiveHighWindows',v_repeats));
 end if;
 update puppy_pupeye.web_fairplay_profiles set
  window_started=case when v_steps>0 then v_now else window_started end,
  window_taps=v_taps,window_rejected=v_rejected,
  volume_stage=v_stage,reject_stage=v_rej_stage,regularity_noted=v_regular,
  prior_high_windows=v_repeats,risk_score=v_score,restricted_until=v_hold,
  updated_at=v_now where account_uuid=p_account_uuid;
 return public.pupeye_web_fairplay_status(p_account_uuid);
end;
$f$;

create or replace function public.pupeye_web_fairplay_admin_cases(p_limit integer default 100)
returns table(id bigint,account_uuid uuid,account_username text,signal text,severity text,
 weight integer,score_after integer,evidence jsonb,status text,created_at timestamptz,
 reviewed_at timestamptz,reviewed_by uuid,review_note text,restricted_until timestamptz)
language sql stable security definer set search_path = ''
as $f$
 select c.id,c.account_uuid,a.username,c.signal,c.severity,c.weight,c.score_after,
        c.evidence,c.status,c.created_at,c.reviewed_at,c.reviewed_by,c.review_note,p.restricted_until
 from puppy_pupeye.web_fairplay_cases c
 join puppy_accounts.pup_accounts a on a.id=c.account_uuid
 left join puppy_pupeye.web_fairplay_profiles p on p.account_uuid=c.account_uuid
 order by (c.status='open') desc,c.created_at desc
 limit least(greatest(coalesce(p_limit,100),1),200);
$f$;

create or replace function public.pupeye_web_fairplay_review(
 p_case_id bigint,p_reviewer uuid,p_resolution text,p_note text)
returns jsonb language plpgsql security definer set search_path = ''
as $f$
declare v_account uuid; v_note text := pg_catalog.btrim(coalesce(p_note,''));
begin
 if p_resolution not in ('dismiss','confirm','clear_hold') or
    pg_catalog.char_length(v_note)<5 or pg_catalog.char_length(v_note)>500 then
  raise exception 'FAIRPLAY_REVIEW_INVALID';
 end if;
 update puppy_pupeye.web_fairplay_cases
 set status=case when p_resolution='dismiss' then 'dismissed' else 'confirmed' end,
  reviewed_at=clock_timestamp(),reviewed_by=p_reviewer,review_note=v_note
 where id=p_case_id and status='open'
 returning account_uuid into v_account;
 if v_account is null then raise exception 'FAIRPLAY_CASE_NOT_OPEN'; end if;
 if p_resolution='clear_hold' then
  update puppy_pupeye.web_fairplay_profiles set restricted_until=null,
   risk_score=least(risk_score,20),prior_high_windows=0,updated_at=clock_timestamp()
  where account_uuid=v_account;
 end if;
 return pg_catalog.jsonb_build_object('updated',true,'accountUuid',v_account,'resolution',p_resolution);
end;
$f$;

-- Service-role-only interfaces; no public browser RPC can inspect or alter investigations.
revoke all on function public.pupeye_web_fairplay_status(uuid) from public,anon,authenticated;
revoke all on function public.pupeye_web_fairplay_record(uuid,text,jsonb) from public,anon,authenticated;
revoke all on function public.pupeye_web_fairplay_admin_cases(integer) from public,anon,authenticated;
revoke all on function public.pupeye_web_fairplay_review(bigint,uuid,text,text) from public,anon,authenticated;
grant execute on function public.pupeye_web_fairplay_status(uuid) to service_role;
grant execute on function public.pupeye_web_fairplay_record(uuid,text,jsonb) to service_role;
grant execute on function public.pupeye_web_fairplay_admin_cases(integer) to service_role;
grant execute on function public.pupeye_web_fairplay_review(bigint,uuid,text,text) to service_role;
