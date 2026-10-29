-- Authorized staff read PupEye Web anomalies through their verified server API.
-- Service-role only: no direct browser RPC access.
create or replace function public.pupeye_web_admin_events(p_limit integer default 50)
returns table (
 id bigint,account_uuid uuid,account_username text,
 event_code text,action_code text,detail jsonb,created_at timestamptz
)
language sql
stable
security invoker
set search_path = pg_catalog, public, puppy_pupeye
as $$
 select e.id,e.account_uuid,a.username as account_username,
  e.event_code,e.action_code,e.detail,e.created_at
 from puppy_pupeye.web_security_events e
 left join public.pup_accounts a on a.id=e.account_uuid
 order by e.created_at desc,e.id desc
 limit least(greatest(coalesce(p_limit,50),1),100)
$$;
revoke all on function public.pupeye_web_admin_events(integer) from public,anon,authenticated;
grant execute on function public.pupeye_web_admin_events(integer) to service_role;
