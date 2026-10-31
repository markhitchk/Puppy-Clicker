-- PupEye server-side chat automation v2 (website).
-- No changes to old messages or staff decisions. Does not retroactively publish pending messages.
-- Service-role RPC only; web and Android clients cannot call this function directly.
create or replace function public.pup_social_submit(
 p_account uuid,p_channel uuid,p_text text,p_client_key uuid,
 p_screening_codes text[],p_screening_version integer
) returns uuid language plpgsql security definer set search_path='' as $fn$
declare v_server uuid;v_id uuid;v_existing text;v_state text;begin
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
 v_state:=case when p_screening_version=2
  and p_screening_codes='{}'::text[]
  and p_text !~* '(https?://|www[.]|discord|instagram|snapchat|telegram|whatsapp|tiktok|[@]|([0-9][ ()+.-]*){10,}|\m(fuck|shit|bitch|asshole|nudes?|porn|sex|sexting|idiot|stupid|threat|kill|suicide|mierda|puta|pendejo|cabron|chingada|sexo|idiota)\M)'
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
 'PupEye Chat v2: safe screened messages published; unsafe or uncertain held. Server RPC only.';
notify pgrst,'reload schema';
