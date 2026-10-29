-- PupEye Web v1. Browser security, separate from native device attestation.
-- Physical server-only tables live in the private Puppy Clicker PupEye schema.
-- Preserve the existing Android PupEye records and canonical public tables.
create schema if not exists puppy_pupeye;

create table if not exists puppy_pupeye.web_rate_buckets (
 account_uuid uuid not null references public.pup_accounts(id) on delete cascade,
 action_code text not null check (action_code in ('gameplay','profile','notifications','exchange','admin','gift')),
 window_start timestamptz not null,
 request_count integer not null default 0 check (request_count >= 0),
 primary key(account_uuid,action_code,window_start)
);
create index if not exists puppy_pupeye_web_rate_buckets_expiry_idx
 on puppy_pupeye.web_rate_buckets(window_start);

create table if not exists puppy_pupeye.web_security_events (
 id bigint generated always as identity primary key,
 account_uuid uuid references public.pup_accounts(id) on delete set null,
 event_code text not null check(event_code in ('RATE_LIMIT','IP_BAN_BLOCK','NETWORK_RISK','REQUEST_BLOCKED')),
 action_code text,
 detail jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create index if not exists puppy_pupeye_web_security_events_account_time_idx
 on puppy_pupeye.web_security_events(account_uuid,created_at desc);
create index if not exists puppy_pupeye_web_security_events_time_idx
 on puppy_pupeye.web_security_events(created_at desc);

alter table puppy_pupeye.web_rate_buckets enable row level security;
alter table puppy_pupeye.web_security_events enable row level security;
revoke all on puppy_pupeye.web_rate_buckets,puppy_pupeye.web_security_events from public,anon,authenticated;
revoke all on sequence puppy_pupeye.web_security_events_id_seq from public,anon,authenticated;
grant usage on schema puppy_pupeye to service_role;
grant select,insert,update,delete on puppy_pupeye.web_rate_buckets,puppy_pupeye.web_security_events to service_role;
grant usage,select on sequence puppy_pupeye.web_security_events_id_seq to service_role;
comment on table puppy_pupeye.web_rate_buckets is 'Web-only per-account signed-request budgets. No client-written score or device attestation.';
comment on table puppy_pupeye.web_security_events is 'Server-authoritative PupEye Web anomalies; never browser-posted guilt findings.';

-- Only the service role may invoke this. Do not expose as browser RPC.
-- Single database upsert makes the budget atomic under concurrent requests.
create or replace function public.pupeye_web_gate(
 p_account_uuid uuid, p_action text
) returns boolean
language plpgsql
security invoker
set search_path = pg_catalog, public, puppy_pupeye
as $$
declare
 v_count integer;
 v_max integer;
 v_now timestamptz := now();
begin
 if p_account_uuid is null or
    not exists(select 1 from public.pup_accounts
      where id=p_account_uuid and status='active') then
  return false;
 end if;
 v_max:=case p_action
   when 'gameplay' then 1200
   when 'notifications' then 120
   when 'profile' then 60
   when 'exchange' then 90
   when 'admin' then 120
   when 'gift' then 60
   else 0 end;
 if v_max=0 then return false; end if;
 insert into puppy_pupeye.web_rate_buckets(account_uuid,action_code,window_start,request_count)
 values(p_account_uuid,p_action,date_trunc('minute',v_now),1)
 on conflict(account_uuid,action_code,window_start)
 do update set request_count=puppy_pupeye.web_rate_buckets.request_count+1
 returning request_count into v_count;
 if v_count>v_max then
  if v_count=v_max+1 then
   insert into puppy_pupeye.web_security_events(account_uuid,event_code,action_code,detail)
   values(p_account_uuid,'RATE_LIMIT',p_action,jsonb_build_object('window','minute','max',v_max));
  end if;
  return false;
 end if;
 return true;
end;
$$;
revoke all on function public.pupeye_web_gate(uuid,text) from public,anon,authenticated;
grant execute on function public.pupeye_web_gate(uuid,text) to service_role;
comment on function public.pupeye_web_gate(uuid,text) is
 'Authorizes web action rate buckets on verified Pup Account. Service-role only; false means account invalid or rate limited.';
