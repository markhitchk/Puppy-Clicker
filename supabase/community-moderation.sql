-- Stage-only: schema for staff-reviewed, server-based Puppy Clicker public channels.
-- No client role receives direct data access. Applications use a trusted server.
create schema if not exists puppy_social;
create table if not exists puppy_social.servers(
 id uuid primary key default gen_random_uuid(), slug text not null unique,
 title text not null, active boolean not null default true,
 created_at timestamptz not null default now(),
 constraint social_server_slug check (slug ~ '^[a-z0-9-]{2,40}$')
);
create table if not exists puppy_social.channels(
 id uuid primary key default gen_random_uuid(),
 server_id uuid not null references puppy_social.servers(id) on delete cascade,
 slug text not null, title text not null,
 writable boolean not null default true,
 active boolean not null default true,
 sort_order integer not null default 0,
 unique (server_id,slug), unique (id,server_id)
);
create table if not exists puppy_social.rules(
 account_uuid uuid primary key references puppy_accounts.pup_accounts(id) on delete cascade,
 version integer not null check (version>0),
 accepted_at timestamptz not null default now()
);
create table if not exists puppy_social.memberships(
 server_id uuid not null references puppy_social.servers(id) on delete cascade,
 account_uuid uuid not null references puppy_accounts.pup_accounts(id) on delete cascade,
 joined_at timestamptz not null default now(),
 primary key(server_id,account_uuid)
);
create table if not exists puppy_social.mutes(
 account_uuid uuid not null references puppy_accounts.pup_accounts(id) on delete cascade,
 server_id uuid not null references puppy_social.servers(id) on delete cascade,
 expires_at timestamptz not null,
 reason text not null,
 issued_by uuid not null references puppy_accounts.pup_accounts(id),
 created_at timestamptz not null default now(),
 primary key(account_uuid,server_id)
);
create table if not exists puppy_social.messages(
 id uuid primary key default gen_random_uuid(),
 server_id uuid not null references puppy_social.servers(id),
 channel_id uuid not null,
 account_uuid uuid not null references puppy_accounts.pup_accounts(id),
 body text not null check(char_length(body) between 1 and 300),
 state text not null default 'pending' check(state in ('pending','published','rejected','removed','expired')),
 screening_codes text[] not null default '{}',
 screening_version integer not null check(screening_version>0),
 idempotency_key uuid not null,
 created_at timestamptz not null default now(),
 moderated_at timestamptz,
 moderated_by uuid references puppy_accounts.pup_accounts(id),
 moderation_reason text,
 unique(account_uuid,idempotency_key),
 foreign key(channel_id,server_id) references puppy_social.channels(id,server_id)
);
create index if not exists social_messages_channel_published_idx
 on puppy_social.messages(channel_id,created_at desc,id) where state='published';
create index if not exists social_messages_account_pending_idx
 on puppy_social.messages(account_uuid,created_at desc) where state='pending';
create index if not exists social_messages_staff_queue_idx
 on puppy_social.messages(created_at,id) where state='pending';
create table if not exists puppy_social.moderation_actions(
 id bigint generated always as identity primary key,
 message_id uuid not null references puppy_social.messages(id) on delete cascade,
 actor_account_uuid uuid not null references puppy_accounts.pup_accounts(id),
 action text not null check(action in ('approve','reject','remove','restore','report_resolve')),
 before_state text not null,
 after_state text not null,
 reason text not null check(char_length(reason) between 3 and 300),
 created_at timestamptz not null default now()
);
create table if not exists puppy_social.reports(
 id uuid primary key default gen_random_uuid(),
 message_id uuid not null references puppy_social.messages(id),
 reporter_account_uuid uuid not null references puppy_accounts.pup_accounts(id),
 reason text not null check(char_length(reason) between 3 and 300),
 state text not null default 'open' check(state in ('open','resolved')),
 resolved_at timestamptz,
 resolved_by uuid references puppy_accounts.pup_accounts(id),
 resolution_reason text,
 created_at timestamptz not null default now(),
 unique(message_id,reporter_account_uuid)
);
create table if not exists puppy_social.blocks(
 blocker_account_uuid uuid not null references puppy_accounts.pup_accounts(id) on delete cascade,
 blocked_account_uuid uuid not null references puppy_accounts.pup_accounts(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(blocker_account_uuid,blocked_account_uuid),
 check(blocker_account_uuid<>blocked_account_uuid)
);
do $plpgsql$ declare v_server uuid; begin
 insert into puppy_social.servers(slug,title) values('official','Puppy Clicker Official')
 on conflict(slug) do update set title=excluded.title returning id into v_server;
 insert into puppy_social.channels(server_id,slug,title,writable,sort_order) values
 (v_server,'general','General',true,1),(v_server,'espanol','Español',true,2),
 (v_server,'help','Help',true,3),(v_server,'announcements','Announcements',false,4)
 on conflict(server_id,slug) do nothing;
end $plpgsql$;
-- Social tables are all private, including report evidence and moderation history.
do $plpgsql$ declare t text; begin
 foreach t in array array['servers','channels','rules','memberships','mutes',
  'messages','moderation_actions','reports','blocks'] loop
  execute format('alter table puppy_social.%I enable row level security',t);
  execute format('revoke all on puppy_social.%I from public,anon,authenticated',t);
  execute format('grant select,insert,update,delete on puppy_social.%I to service_role',t);
 end loop;
end $plpgsql$;
revoke all on schema puppy_social from public,anon,authenticated;
grant usage on schema puppy_social to service_role;
grant usage,select on sequence puppy_social.moderation_actions_id_seq to service_role;
-- Service-role-only REST views, no direct table access to users.
create or replace view public.pup_social_servers with(security_invoker=true) as
 select * from puppy_social.servers;
create or replace view public.pup_social_channels with(security_invoker=true) as
 select * from puppy_social.channels;
create or replace view public.pup_social_rules with(security_invoker=true) as
 select * from puppy_social.rules;
create or replace view public.pup_social_memberships with(security_invoker=true) as
 select * from puppy_social.memberships;
create or replace view public.pup_social_messages with(security_invoker=true) as
 select * from puppy_social.messages;
create or replace view public.pup_social_mutes with(security_invoker=true) as
 select * from puppy_social.mutes;
create or replace view public.pup_social_reports with(security_invoker=true) as
 select * from puppy_social.reports;
create or replace view public.pup_social_blocks with(security_invoker=true) as
 select * from puppy_social.blocks;
create or replace view public.pup_social_moderation_actions with(security_invoker=true) as
 select * from puppy_social.moderation_actions;
do $plpgsql$ declare t text; begin
 foreach t in array array['servers','channels','rules','memberships','mutes',
 'messages','reports','blocks','moderation_actions'] loop
  execute format('revoke all on public.%I from public,anon,authenticated','pup_social_'||t);
  execute format('grant select,insert,update,delete on public.%I to service_role','pup_social_'||t);
 end loop;
end $plpgsql$;
-- Submissions: one transaction for idempotency and concurrency-safe per-account limits.
create or replace function public.pup_social_submit(
 p_account uuid,p_channel uuid,p_text text,p_client_key uuid,
 p_screening_codes text[],p_screening_version integer
) returns uuid language plpgsql security definer set search_path='' as $fn$
declare v_server uuid;v_id uuid;v_existing text;begin
 if p_account is null or p_channel is null or p_client_key is null
    or p_text is null or char_length(p_text) not between 1 and 300
    or octet_length(p_text)>1200 or p_screening_version is null or p_screening_version<1
 then raise exception 'CHAT_INVALID_INPUT';end if;
 if not exists(select 1 from puppy_accounts.pup_accounts a
   where a.id=p_account and a.status='active')
 then raise exception 'CHAT_ACCOUNT_INACTIVE';end if;
 select server_id into v_server from puppy_social.channels
 where id=p_channel and active=true and writable=true;
 if v_server is null or not exists(select 1 from puppy_social.servers
 where id=v_server and active=true) then raise exception 'CHAT_CHANNEL_UNAVAILABLE';end if;
 if not exists(select 1 from puppy_social.memberships where server_id=v_server and account_uuid=p_account)
 or not exists(select 1 from puppy_social.rules where account_uuid=p_account and version>=1)
 then raise exception 'CHAT_RULES_OR_MEMBERSHIP_REQUIRED';end if;
 if exists(select 1 from puppy_social.mutes where account_uuid=p_account and server_id=v_server and expires_at>now())
 then raise exception 'CHAT_MUTED';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_account::text,0));
 select id,body into v_id,v_existing from puppy_social.messages where account_uuid=p_account and idempotency_key=p_client_key;
 if v_id is not null then
  if v_existing<>p_text then raise exception 'CHAT_IDEMPOTENCY_MISMATCH';end if;
  return v_id;
 end if;
 if exists(select 1 from puppy_social.messages where account_uuid=p_account and created_at>now()-interval '5 seconds')
 or (select count(*) from puppy_social.messages where account_uuid=p_account
     and created_at>now()-interval '1 minute')>=10
 or (select count(*) from puppy_social.messages where account_uuid=p_account and state='pending')>=10
 then raise exception 'CHAT_RATE_LIMIT';end if;
 insert into puppy_social.messages(server_id,channel_id,account_uuid,body,idempotency_key,
 screening_codes,screening_version,state)
 values(v_server,p_channel,p_account,p_text,p_client_key,
 coalesce(p_screening_codes,array[]::text[]),p_screening_version,'pending')
 returning id into v_id;
 return v_id;
end $fn$;
-- One atomic authorization, state transition, and audit record for all staff decisions.
create or replace function public.pup_social_review(
 p_actor uuid,p_message uuid,p_action text,p_reason text
) returns text language plpgsql security definer set search_path='' as $fn$
declare v_previous text;v_next text;v_created timestamptz;v_flags text[];v_author uuid;begin
 if p_actor is null or p_message is null
 or p_reason is null or char_length(trim(p_reason)) not between 3 and 300
 then raise exception 'CHAT_INVALID_MODERATION';end if;
 if not exists(select 1 from puppy_accounts.pup_accounts a
 join puppy_pupeye.pupeye_players p on p.id=a.player_uuid
 where a.id=p_actor and a.status='active' and p.status='active'
 and p.guild_role in ('ADMIN','DEVELOPER')) then raise exception 'CHAT_STAFF_REQUIRED';end if;
 select state,created_at,screening_codes,account_uuid into v_previous,v_created,v_flags,v_author
 from puppy_social.messages where id=p_message for update;
 if v_previous is null then raise exception 'CHAT_MESSAGE_NOT_FOUND';end if;
 -- A flagged message is never permitted to bypass a hard safety rule, even by staff.
 if p_action in ('approve','restore') and
   (coalesce(v_flags,array[]::text[]) && array['SEXUAL','SOLICITATION','THREAT','HATE','CONTACT','PHONE','SCAM']::text[])
 then raise exception 'CHAT_HIGH_RISK_REJECT_REQUIRED';end if;
 if p_action in ('approve','restore') and not exists(
  select 1 from puppy_accounts.pup_accounts a
  join puppy_pupeye.pupeye_players p on p.id=a.player_uuid
  where a.id=v_author and a.status='active' and p.status='active'
 ) then raise exception 'CHAT_AUTHOR_INACTIVE';end if;
 v_next:=case
 when p_action='approve' and v_previous='pending' and v_created>now()-interval '24 hours' then 'published'
 when p_action='reject' and v_previous='pending' then 'rejected'
 when p_action='remove' and v_previous='published' then 'removed'
 when p_action='restore' and v_previous='removed' then 'published'
 else null end;
 if v_next is null then raise exception 'CHAT_STATE_CONFLICT';end if;
 update puppy_social.messages set state=v_next,moderated_at=now(),
  moderated_by=p_actor,moderation_reason=trim(p_reason) where id=p_message;
 insert into puppy_social.moderation_actions(message_id,actor_account_uuid,action,
  before_state,after_state,reason) values(p_message,p_actor,p_action,v_previous,v_next,trim(p_reason));
 return v_next;
end $fn$;
-- Resolve a report with an atomic, staff-only action and retained audit.
create or replace function public.pup_social_resolve_report(
 p_actor uuid,p_report uuid,p_reason text
) returns boolean language plpgsql security definer set search_path='' as $fn$
declare v_message uuid;v_state text;begin
 if p_actor is null or p_report is null or p_reason is null
 or char_length(trim(p_reason)) not between 3 and 300
 then raise exception 'CHAT_INVALID_MODERATION';end if;
 if not exists(select 1 from puppy_accounts.pup_accounts a
 join puppy_pupeye.pupeye_players p on p.id=a.player_uuid
 where a.id=p_actor and a.status='active' and p.status='active'
 and p.guild_role in ('ADMIN','DEVELOPER')) then raise exception 'CHAT_STAFF_REQUIRED';end if;
 select message_id into v_message from puppy_social.reports
 where id=p_report and state='open' for update;
 if v_message is null then raise exception 'CHAT_REPORT_UNAVAILABLE';end if;
 select state into v_state from puppy_social.messages where id=v_message;
 update puppy_social.reports set state='resolved',resolved_at=now(),
  resolved_by=p_actor,resolution_reason=trim(p_reason) where id=p_report;
 insert into puppy_social.moderation_actions(message_id,actor_account_uuid,action,
  before_state,after_state,reason)
 values(v_message,p_actor,'report_resolve',v_state,v_state,trim(p_reason));
 return true;
end $fn$;
-- Retention must be scheduled and verified via Supabase Cron before enabling community chat.
create or replace function public.pup_social_cleanup()
 returns jsonb language plpgsql security definer set search_path='' as $fn$
declare v_pending int;v_bodies int;v_reports int;v_actions int;begin
 update puppy_social.messages set state='expired',body='[expired before review]',
  screening_codes=array[]::text[] where state='pending'
  and created_at<now()-interval '24 hours';
 get diagnostics v_pending=row_count;
 update puppy_social.messages m set body='[content expired]',
  screening_codes=array[]::text[]
 where state in ('published','rejected','removed') and created_at<now()-interval '30 days'
 and body<>'[content expired]'
 and not exists(select 1 from puppy_social.reports r where r.message_id=m.id
  and r.state='open' and r.created_at>now()-interval '90 days');
 get diagnostics v_bodies=row_count;
 delete from puppy_social.reports where created_at<now()-interval '90 days';
 get diagnostics v_reports=row_count;
 delete from puppy_social.moderation_actions where created_at<now()-interval '180 days';
 get diagnostics v_actions=row_count;
 return pg_catalog.jsonb_build_object('pending_expired',v_pending,'bodies_expired',v_bodies,
  'reports_expired',v_reports,'audits_expired',v_actions);
end $fn$;
revoke all on function public.pup_social_submit(uuid,uuid,text,uuid,text[],integer) from public,anon,authenticated;
revoke all on function public.pup_social_review(uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.pup_social_cleanup() from public,anon,authenticated;
revoke all on function public.pup_social_resolve_report(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.pup_social_submit(uuid,uuid,text,uuid,text[],integer) to service_role;
grant execute on function public.pup_social_review(uuid,uuid,text,text) to service_role;
grant execute on function public.pup_social_cleanup() to service_role;
grant execute on function public.pup_social_resolve_report(uuid,uuid,text) to service_role;
