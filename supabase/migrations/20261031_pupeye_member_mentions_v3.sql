-- Puppy Clicker chat: member-only @mentions in server-side auto moderation v3.
-- No retroactive message publication or account data mutation.
-- Preserves joins, membership, consent, rate limits, bans, mutes and audit mechanisms.
create or replace function public.pup_social_submit(
 p_account uuid,p_channel uuid,p_text text,p_client_key uuid,
 p_screening_codes text[],p_screening_version integer
) returns uuid language plpgsql security definer set search_path='' as $fn$
declare v_server uuid;v_id uuid;v_existing text;v_state text;
 v_safe_text text;v_mention text;v_mentions_ok boolean:=true;begin
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
 -- Only a version-2 trusted server screening result may use automatic publication.
 -- The function itself also checks common high-risk tokens, even if codes are empty.
 -- Legacy v1, any flagged message, and suspicious text all stay in staff review.
 -- Confirm every @mention refers to an active Pup Account in this server.
 -- This is defense-in-depth; the trusted API also checks membership before RPC.
 for v_mention in
  select distinct lower(substring((m.parts)[1] from 2))
  from regexp_matches(p_text,'@[A-Za-z0-9_-]{3,20}','g') as m(parts)
 loop
  if not exists(
   select 1 from puppy_accounts.pup_accounts a
   join puppy_social.memberships member on member.account_uuid=a.id
   where member.server_id=v_server and a.status='active'
     and lower(a.username)=v_mention
  ) then v_mentions_ok:=false; end if;
 end loop;
 -- Remove recognized in-game handles only for the regex safety gate.
 -- Unrecognized @ signs, email addresses and known contact providers still block publication.
 v_safe_text:=regexp_replace(p_text,'@[A-Za-z0-9_-]{3,20}',' ','g');
 v_state:=case when p_screening_version=2
  and p_screening_codes='{}'::text[]
  and v_mentions_ok
  and p_text !~* '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+[.][A-Za-z]{2,}'
  and p_text !~* '\m(discord|instagram|snapchat|telegram|whatsapp|tiktok)\M'
  and v_safe_text !~* '(https?://|www[.]|[@]|([0-9][ ()+.-]*){10,}|\m(fuck|shit|bitch|asshole|nudes?|porn|sex|sexting|idiot|stupid|threat|kill|suicide|mierda|puta|pendejo|cabron|chingada|sexo|idiota)\M)'
 then 'published' else 'pending' end;
 insert into puppy_social.messages(server_id,channel_id,account_uuid,body,idempotency_key,
 screening_codes,screening_version,state,moderated_at,moderation_reason)
 values(v_server,p_channel,p_account,p_text,p_client_key,
 coalesce(p_screening_codes,array[]::text[]),p_screening_version,v_state,
 case when v_state='published' then now() else null end,
 case when v_state='published' then 'PupEye automated screening v2' else null end)
 returning id into v_id;
 return v_id;
end $fn$;
revoke execute on function public.pup_social_submit(uuid,uuid,text,uuid,text[],integer) from public,anon,authenticated;
grant execute on function public.pup_social_submit(uuid,uuid,text,uuid,text[],integer) to service_role;
comment on function public.pup_social_submit(uuid,uuid,text,uuid,text[],integer) is
 'PupEye v3: server-member mentions can auto-publish when screening is clean. Unknown contact handles remain pending.';
notify pgrst,'reload schema';
