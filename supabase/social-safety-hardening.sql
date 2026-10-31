-- Puppy Clicker social safety controls: staff mutes and rate-limited reports.
alter table puppy_social.moderation_actions drop constraint if exists moderation_actions_action_check;
alter table puppy_social.moderation_actions add constraint moderation_actions_action_check
 check(action in ('approve','reject','remove','restore','report_resolve','mute','unmute'));
create index if not exists social_reports_reporter_recent_idx on puppy_social.reports(reporter_account_uuid,created_at desc);
create or replace function public.pup_social_report(
 p_account uuid,p_message uuid,p_reason text
) returns boolean language plpgsql security definer set search_path='' as $fn$
declare v_server uuid;v_state text;begin
 if p_account is null or p_message is null or p_reason is null or char_length(trim(p_reason)) not between 3 and 300
 then raise exception 'CHAT_INVALID_REPORT';end if;
 select server_id,state into v_server,v_state from puppy_social.messages where id=p_message;
 if v_server is null or v_state<>'published' then raise exception 'MESSAGE_UNAVAILABLE';end if;
 if not exists(select 1 from puppy_accounts.pup_accounts where id=p_account and status='active')
 or not exists(select 1 from puppy_social.memberships where server_id=v_server and account_uuid=p_account)
 then raise exception 'CHAT_JOIN_REQUIRED';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_account::text,1));
 if exists(select 1 from puppy_social.reports where reporter_account_uuid=p_account and message_id=p_message)
 then return true;end if;
 if (select count(*) from puppy_social.reports where reporter_account_uuid=p_account
 and created_at>now()-interval '1 hour')>=5 then raise exception 'CHAT_REPORT_RATE_LIMIT';end if;
 insert into puppy_social.reports(reporter_account_uuid,message_id,reason) values(p_account,p_message,trim(p_reason));
 return true;
end $fn$;
create or replace function public.pup_social_manage_mute(
 p_actor uuid,p_message uuid,p_hours integer,p_reason text
) returns boolean language plpgsql security definer set search_path='' as $fn$
declare v_account uuid;v_server uuid;v_state text;v_action text;begin
 if p_actor is null or p_message is null or p_hours is null or p_hours<0 or p_hours>168 or
 p_reason is null or char_length(trim(p_reason)) not between 3 and 300
 then raise exception 'CHAT_INVALID_MODERATION';end if;
 if not exists(select 1 from puppy_accounts.pup_accounts a
  join puppy_pupeye.pupeye_players p on p.id=a.player_uuid
  where a.id=p_actor and a.status='active' and p.status='active'
  and p.guild_role in ('ADMIN','DEVELOPER'))
 then raise exception 'CHAT_STAFF_REQUIRED';end if;
 select account_uuid,server_id,state into v_account,v_server,v_state
  from puppy_social.messages where id=p_message for update;
 if v_account is null then raise exception 'CHAT_MESSAGE_NOT_FOUND';end if;
 if p_actor=v_account then raise exception 'CHAT_STAFF_SELF_ACTION';end if;
 if p_hours=0 then
  delete from puppy_social.mutes where account_uuid=v_account and server_id=v_server;
  v_action:='unmute';
 else
  insert into puppy_social.mutes(account_uuid,server_id,expires_at,reason,issued_by)
  values(v_account,v_server,now()+make_interval(hours=>p_hours),trim(p_reason),p_actor)
  on conflict(account_uuid,server_id) do update set
  expires_at=excluded.expires_at,reason=excluded.reason,issued_by=excluded.issued_by;
  v_action:='mute';
 end if;
 insert into puppy_social.moderation_actions(message_id,actor_account_uuid,action,
 before_state,after_state,reason) values(p_message,p_actor,v_action,v_state,v_state,trim(p_reason));
 return true;
end $fn$;
revoke all on function public.pup_social_report(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.pup_social_manage_mute(uuid,uuid,integer,text) from public,anon,authenticated;
grant execute on function public.pup_social_report(uuid,uuid,text) to service_role;
grant execute on function public.pup_social_manage_mute(uuid,uuid,integer,text) to service_role;
