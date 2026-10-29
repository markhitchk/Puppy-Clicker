-- Review and deploy in Supabase before enabling VITE_NETWORK_CHECK_ENABLED.
-- Private network telemetry table; never grant Data API read or write to browser roles.
-- This is separate from account/PupEye bans and does not automatically impose sanctions.
create table if not exists public.pup_web_network_checks (
  id bigint generated always as identity primary key,
  checked_at timestamptz not null default now(),
  auth_user_id uuid null,
  account_uuid uuid null references public.pup_accounts(id) on delete set null,
  ip_address inet not null,
  user_agent text not null check (char_length(user_agent) <= 2048),
  detection_status text not null check (detection_status in ('detected','not_detected','unknown')),
  vpn boolean null, proxy boolean null, tor boolean null,
  hosting boolean null, anonymous boolean null,
  risk_score integer null check (risk_score between 0 and 100),
  confidence integer null check (confidence between 0 and 100),
  provider text not null default 'proxycheck-v3'
);
create index if not exists pup_web_network_checks_time_idx on public.pup_web_network_checks (checked_at desc);
create index if not exists pup_web_network_checks_account_idx on public.pup_web_network_checks (account_uuid, checked_at desc);
create index if not exists pup_web_network_checks_ip_idx on public.pup_web_network_checks (ip_address, checked_at desc);
alter table public.pup_web_network_checks enable row level security;
revoke all on table public.pup_web_network_checks from anon, authenticated;
revoke all on sequence public.pup_web_network_checks_id_seq from anon, authenticated;
-- No client-facing policies by design. Grant access only through narrowly authorized admin APIs.
-- Set a retention policy before launch, e.g. a scheduled task executing:
-- DELETE FROM public.pup_web_network_checks WHERE checked_at < now() - interval '30 days';

-- These records are written only by trusted website/Edge servers. Browser roles
-- cannot read sessions, identify another player, or forge successful auth events.
create table public.pup_web_sessions (
 id uuid primary key default gen_random_uuid(),
 browser_session_id uuid not null,
 identity_key text not null,
 account_uuid uuid references public.pup_accounts(id) on delete cascade,
 auth_user_id uuid references auth.users(id) on delete set null,
 ip_address inet,
 user_agent text not null check (char_length(user_agent)<=1024),
 path text not null check (char_length(path)<=160),
 started_at timestamptz not null default now(),
 last_seen_at timestamptz not null default now(),
 ended_at timestamptz,
 unique(browser_session_id,identity_key)
);
create index pup_web_sessions_seen_idx on public.pup_web_sessions(last_seen_at desc);
create index pup_web_sessions_account_seen_idx on public.pup_web_sessions(account_uuid,last_seen_at desc);
create index pup_web_sessions_auth_idx on public.pup_web_sessions(auth_user_id);
create index pup_web_sessions_ip_seen_idx on public.pup_web_sessions(ip_address,started_at desc);

create table public.pup_web_activity_events (
 id bigint generated always as identity primary key,
 browser_session_id uuid,
 account_uuid uuid references public.pup_accounts(id) on delete cascade,
 auth_user_id uuid references auth.users(id) on delete set null,
 event_code text not null check (event_code in ('page_view','session_end','logout','client_error','auth_error',
  'login_success','login_failed','register_success','register_failed','discord_authorized','discord_registration_required','service_error')),
 source text not null check (source in ('browser','server')),
 outcome text not null check (outcome in ('info','success','failure')),
 provider text check (provider in ('password','discord')),
 error_code text check (error_code ~ '^[A-Z][A-Z0-9_]{2,79}$'),
 login_hint text check (login_hint ~ '^[A-Za-z0-9_-]{3,20}$'),
 path text not null check (char_length(path)<=160),
 ip_address inet,
 user_agent text not null check (char_length(user_agent)<=1024),
 created_at timestamptz not null default now(),
 constraint pup_web_activity_trusted_success check (source='server' or
  (event_code in ('page_view','session_end','logout','client_error','auth_error') and outcome<>'success'))
);
create index pup_web_activity_time_idx on public.pup_web_activity_events(created_at desc);
create index pup_web_activity_account_time_idx on public.pup_web_activity_events(account_uuid,created_at desc);
create index pup_web_activity_auth_idx on public.pup_web_activity_events(auth_user_id);
create index pup_web_activity_ip_time_idx on public.pup_web_activity_events(ip_address,created_at desc);
create index pup_web_activity_code_time_idx on public.pup_web_activity_events(event_code,created_at desc);

alter table public.pup_web_sessions enable row level security;
alter table public.pup_web_activity_events enable row level security;
revoke all on public.pup_web_sessions,public.pup_web_activity_events,public.pup_web_network_checks from public,anon,authenticated;
revoke all on sequence public.pup_web_activity_events_id_seq,public.pup_web_network_checks_id_seq from public,anon,authenticated;
grant select,insert,update,delete on public.pup_web_sessions,public.pup_web_activity_events,public.pup_web_network_checks to service_role;
grant usage,select on sequence public.pup_web_activity_events_id_seq,public.pup_web_network_checks_id_seq to service_role;

create function public.record_pup_web_activity(
 p_session_id uuid,p_account_uuid uuid,p_auth_user_id uuid,
 p_event_code text,p_source text,p_outcome text,p_path text,p_ip inet,
 p_user_agent text,p_error_code text,p_provider text,p_login_hint text
) returns boolean language plpgsql security invoker set search_path=public as $$
declare
 v_now timestamptz:=now();
 v_key text;
 v_session public.pup_web_sessions%rowtype;
 v_path text;
 v_outcome text;
begin
 if p_source not in ('browser','server') or p_outcome not in ('info','success','failure') then
  raise exception 'Invalid activity source or outcome' using errcode='22023';
 end if;
 if p_source='browser' and (p_session_id is null or p_event_code not in
  ('page_view','heartbeat','session_end','logout','client_error','auth_error')) then
  raise exception 'Invalid browser activity' using errcode='22023';
 end if;
 if p_source='browser' and p_account_uuid is not null and not exists(
  select 1 from public.pup_web_auth_links where account_uuid=p_account_uuid and auth_user_id=p_auth_user_id
 ) then raise exception 'Unverified activity identity' using errcode='42501'; end if;
 v_path:=case when p_path ~ '^/(play|account(/admin(/(users|bans|audit|gifts|activity))?)?|register|recovery|puppies|auth/discord/callback)?/?$'
  then p_path else '/other' end;
 v_outcome:=case when p_source='browser' then
  case when p_event_code in ('client_error','auth_error') then 'failure' else 'info' end else p_outcome end;
 -- Serialize rate-budget checks per server-observed IP, never a client body IP.
 perform pg_advisory_xact_lock(hashtextextended('pup-activity:'||coalesce(p_ip::text,'unknown'),0));
 if (select count(*) from public.pup_web_activity_events where ip_address is not distinct from p_ip
  and created_at>v_now-interval '1 minute')>=120 then return false; end if;
 if p_source='browser' then
  v_key:=coalesce(p_account_uuid::text,'visitor:'||coalesce(p_ip::text,'unknown'))||':'||md5(coalesce(p_user_agent,''));
  select * into v_session from public.pup_web_sessions where browser_session_id=p_session_id and identity_key=v_key for update;
  if found and p_event_code='heartbeat' and v_session.ended_at is null and v_session.last_seen_at>v_now-interval '15 seconds' then return false; end if;
  if not found and (select count(*) from public.pup_web_sessions where ip_address is not distinct from p_ip
    and started_at>v_now-interval '1 minute')>=50 then return false; end if;
  if p_account_uuid is not null then
   update public.pup_web_sessions set ended_at=v_now where browser_session_id=p_session_id
    and account_uuid is null and ended_at is null;
  end if;
  insert into public.pup_web_sessions(browser_session_id,identity_key,account_uuid,auth_user_id,ip_address,user_agent,path,ended_at)
   values(p_session_id,v_key,p_account_uuid,p_auth_user_id,p_ip,left(coalesce(p_user_agent,''),1024),v_path,
    case when p_event_code in ('session_end','logout') then v_now end)
   on conflict(browser_session_id,identity_key) do update set
    last_seen_at=v_now,ip_address=excluded.ip_address,path=excluded.path,
    auth_user_id=excluded.auth_user_id,ended_at=excluded.ended_at;
 end if;
 -- Heartbeats update presence without filling the event timeline every 30s.
 if p_event_code<>'heartbeat' then
  -- Strict-mode mounts/navigation can send the same event twice in one moment.
  if exists(select 1 from public.pup_web_activity_events where browser_session_id=p_session_id
   and account_uuid is not distinct from p_account_uuid and event_code=p_event_code and source=p_source
   and path=v_path and error_code is not distinct from p_error_code
   and created_at>v_now-interval '2 seconds') then return true; end if;
  insert into public.pup_web_activity_events(browser_session_id,account_uuid,auth_user_id,event_code,source,outcome,
   provider,error_code,login_hint,path,ip_address,user_agent)
   values(p_session_id,p_account_uuid,p_auth_user_id,p_event_code,p_source,v_outcome,
    case when p_provider in ('password','discord') then p_provider end,
    case when p_error_code ~ '^[A-Z][A-Z0-9_]{2,79}$' then p_error_code end,
    case when p_source='server' and p_login_hint ~ '^[A-Za-z0-9_-]{3,20}$' then p_login_hint end,
    v_path,p_ip,left(coalesce(p_user_agent,''),1024));
 end if;
 -- Bounded housekeeping of only this feature's diagnostic records.
 delete from public.pup_web_activity_events where id in(select id from public.pup_web_activity_events where created_at<v_now-interval '30 days' limit 100);
 delete from public.pup_web_sessions where id in(select id from public.pup_web_sessions where last_seen_at<v_now-interval '30 days' limit 100);
 delete from public.pup_web_network_checks where id in(select id from public.pup_web_network_checks where checked_at<v_now-interval '30 days' limit 100);
 return true;
end;
$$;
revoke all on function public.record_pup_web_activity(uuid,uuid,uuid,text,text,text,text,inet,text,text,text,text) from public,anon,authenticated;
grant execute on function public.record_pup_web_activity(uuid,uuid,uuid,text,text,text,text,inet,text,text,text,text) to service_role;
comment on table public.pup_web_sessions is 'Private, server-associated website presence. Browser sessions are not Android installations or accounts.';
comment on table public.pup_web_activity_events is 'Safe website/auth outcomes. No passwords, tokens, OAuth codes, query strings, or raw exceptions.';

-- Recheck standing/roles under locks and commit the ban, target and staff audit
-- together. A failed audit cannot leave a successful but apparently failed ban.
create function public.moderate_registered_pup_account(
 p_actor_player_uuid uuid,p_target_player_uuid uuid,p_action text,
 p_reason text default null,p_expires_at timestamptz default null,p_ban_uuid uuid default null
) returns jsonb language plpgsql security invoker set search_path=public as $$
declare
 v_actor public.pupeye_players%rowtype;
 v_target public.pupeye_players%rowtype;
 v_ban public.pupeye_global_bans%rowtype;
 v_created record;
 v_target_id uuid:=p_target_player_uuid;
 v_action_code text;
begin
 if p_action is null or p_action not in ('ban-account','suspend-account','unban-account') then
  raise exception 'INVALID_ADMIN_ACTION' using errcode='22023';
 end if;
 -- Serialize web moderation, including role changes that take row locks.
 select * into v_actor from public.pupeye_players where id=p_actor_player_uuid for update;
 if not found or v_actor.status<>'active' or coalesce(v_actor.guild_role,'') not in ('ADMIN','DEVELOPER') or not exists(
  select 1 from public.pup_accounts where player_uuid=p_actor_player_uuid and status='active'
 ) then raise exception 'STAFF_ACCESS_REQUIRED' using errcode='42501'; end if;
 if exists(select 1 from public.pupeye_resolve_global_ban(p_actor_player_uuid,v_actor.discord_user_id,null,null,null)) then
  raise exception 'ACCOUNT_BANNED' using errcode='42501';
 end if;
 if p_action='unban-account' then
  select * into v_ban from public.pupeye_global_bans where id=p_ban_uuid for update;
  if not found then raise exception 'BAN_NOT_FOUND' using errcode='P0002'; end if;
  if v_ban.issued_by not like 'web_admin:%' then raise exception 'MANAGE_FROM_ORIGINAL_SYSTEM' using errcode='42501'; end if;
  if (select count(*) from public.pupeye_ban_targets where ban_uuid=p_ban_uuid)<>1 then
   raise exception 'MANAGE_FROM_ORIGINAL_SYSTEM' using errcode='42501';
  end if;
  select player_uuid into v_target_id from public.pupeye_ban_targets where ban_uuid=p_ban_uuid and target_type='PLAYER';
 end if;
 select * into v_target from public.pupeye_players where id=v_target_id for update;
 if not found or not exists(select 1 from public.pup_accounts where player_uuid=v_target_id) then
  raise exception 'REGISTERED_PUP_ACCOUNT_REQUIRED' using errcode='22023';
 end if;
 if p_actor_player_uuid=v_target_id or (v_actor.guild_role<>'DEVELOPER' and v_target.guild_role in ('ADMIN','DEVELOPER')) then
  raise exception 'CANNOT_SANCTION_STAFF' using errcode='42501';
 end if;
 if p_action='unban-account' then
  if v_ban.status<>'active' then return jsonb_build_object('revoked',true,'unchanged',true); end if;
  perform public.pupeye_revoke_global_ban(p_ban_uuid,'web_admin:'||p_actor_player_uuid::text,'Lifted through website administration');
  insert into public.pup_admin_actions(actor_player_uuid,target_player_uuid,action_code,detail)
   values(p_actor_player_uuid,v_target_id,'WEB_BAN_REVOKED',jsonb_build_object('source','web_admin','banId',p_ban_uuid));
  return jsonb_build_object('revoked',true);
 end if;
 if char_length(trim(coalesce(p_reason,''))) not between 3 and 300 then
  raise exception 'INVALID_BAN_REASON' using errcode='22023';
 end if;
 if p_expires_at is not null and (p_expires_at<=now() or p_expires_at>now()+interval '5 years') then
  raise exception 'INVALID_BAN_EXPIRY' using errcode='22023';
 end if;
 if p_action='suspend-account' and p_expires_at is null then
  raise exception 'SUSPENSION_EXPIRY_REQUIRED' using errcode='22023';
 end if;
 select * into v_created from public.pupeye_create_global_ban(
  case when p_expires_at is null then 'permanent' else 'temporary' end,
  case when p_action='suspend-account' then 'WEB_ADMIN_SUSPENSION' else 'WEB_ADMIN' end,
  trim(p_reason),'Issued through protected web admin',p_expires_at,'web_admin:'||p_actor_player_uuid::text,null,
  jsonb_build_array(jsonb_build_object('type','PLAYER','playerUuid',v_target_id))
 );
 v_action_code:=case when p_action='suspend-account' then 'WEB_SUSPENSION_CREATED' else 'WEB_BAN_CREATED' end;
 insert into public.pup_admin_actions(actor_player_uuid,target_player_uuid,action_code,detail)
  values(p_actor_player_uuid,v_target_id,v_action_code,jsonb_build_object('source','web_admin','banId',v_created.ban_uuid,
   'reason',trim(p_reason),'expiresAt',p_expires_at));
 return jsonb_build_object('created',true,'banId',v_created.ban_uuid);
end;
$$;
revoke all on function public.moderate_registered_pup_account(uuid,uuid,text,text,timestamptz,uuid) from public,anon,authenticated;
grant execute on function public.moderate_registered_pup_account(uuid,uuid,text,text,timestamptz,uuid) to service_role;
