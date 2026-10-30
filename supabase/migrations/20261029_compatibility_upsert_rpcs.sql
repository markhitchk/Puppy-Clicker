-- Phase A: compatibility RPCs for write paths requiring ON CONFLICT.
-- Only the service role may call these functions, even though their API names
-- remain in public for installed React Native / Edge Function compatibility.

create or replace function public.puppy_upsert_save_head(p_payload jsonb)
returns boolean language plpgsql security invoker set search_path=pg_catalog,public as $$
declare v public.pupeye_save_heads%rowtype;
begin
 select * into v from jsonb_populate_record(null::public.pupeye_save_heads,p_payload);
 if v.installation_uuid is null or v.generation is null or v.support_code is null then
   raise exception 'INVALID_PUP_EYE_SAVE_HEAD' using errcode='22023';
 end if;
 insert into public.pupeye_save_heads as h
 (installation_uuid,generation,support_code,last_reason,hard_flags,updated_at)
 values(v.installation_uuid,v.generation,v.support_code,v.last_reason,coalesce(v.hard_flags,array[]::text[]),coalesce(v.updated_at,now()))
 on conflict (installation_uuid) do update set
 generation=excluded.generation,support_code=excluded.support_code,
 last_reason=excluded.last_reason,hard_flags=excluded.hard_flags,updated_at=excluded.updated_at;
 return true;
end $$;

create or replace function public.puppy_upsert_device_migration(p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare v public.pupeye_device_migrations%rowtype; result jsonb;
begin
 select * into v from jsonb_populate_record(null::public.pupeye_device_migrations,p_payload);
 if v.player_uuid is null or v.requested_installation_id is null or v.requested_device_key_id is null
 or v.requested_public_key_b64 is null or v.requested_support_code is null then
   raise exception 'INVALID_PUP_EYE_MIGRATION' using errcode='22023';
 end if;
 insert into public.pupeye_device_migrations as m
 (player_uuid,from_installation_uuid,requested_installation_id,
 requested_device_key_id,requested_public_key_b64,requested_support_code,
 requested_device_model,requested_app_version,status,requested_at)
 values(v.player_uuid,v.from_installation_uuid,v.requested_installation_id,
 v.requested_device_key_id,v.requested_public_key_b64,v.requested_support_code,
 v.requested_device_model,v.requested_app_version,coalesce(v.status,'pending'),coalesce(v.requested_at,now()))
 on conflict(player_uuid,requested_installation_id,requested_device_key_id) do update set
 from_installation_uuid=excluded.from_installation_uuid,
 requested_public_key_b64=excluded.requested_public_key_b64,
 requested_support_code=excluded.requested_support_code,
 requested_device_model=excluded.requested_device_model,
 requested_app_version=excluded.requested_app_version,
 status=excluded.status,requested_at=excluded.requested_at
 returning to_jsonb(m) into result;
 return result;
end $$;

create or replace function public.puppy_upsert_beta_link(p_payload jsonb)
returns boolean language plpgsql security invoker set search_path=pg_catalog,public as $$
declare v public.pup_beta_account_links%rowtype;
begin
 select * into v from jsonb_populate_record(null::public.pup_beta_account_links,p_payload);
 if v.installation_uuid is null or v.account_uuid is null or v.expires_at is null then
  raise exception 'INVALID_BETA_LINK' using errcode='22023';
 end if;
 insert into public.pup_beta_account_links as b
 (installation_uuid,account_uuid,discord_user_id,credential_auth_user_id,expires_at,verified_at)
 values(v.installation_uuid,v.account_uuid,v.discord_user_id,v.credential_auth_user_id,v.expires_at,coalesce(v.verified_at,now()))
 on conflict(installation_uuid) do update set
 account_uuid=excluded.account_uuid,
 discord_user_id=case when p_payload?'discord_user_id' then excluded.discord_user_id else b.discord_user_id end,
 credential_auth_user_id=case when p_payload?'credential_auth_user_id' then excluded.credential_auth_user_id else b.credential_auth_user_id end,
 expires_at=excluded.expires_at,verified_at=excluded.verified_at;
 return true;
end $$;

create or replace function public.puppy_seed_exchange_policy(p_ids text[])
returns boolean language plpgsql security invoker set search_path=pg_catalog,public as $$
begin
 if p_ids is null or array_length(p_ids,1)>100 or exists(
  select 1 from unnest(p_ids) x where x is null or length(x)<2 or length(x)>100
 ) then raise exception 'INVALID_POLICY_CATALOG' using errcode='22023'; end if;
 insert into public.pup_exchange_transfer_policy
 (puppy_id,giftable,tradeable,bound,source_copy)
 select distinct x,false,false,true,false from unnest(p_ids) x
 on conflict (puppy_id) do nothing;
 return true;
end $$;

revoke all on function public.puppy_upsert_save_head(jsonb),
 public.puppy_upsert_device_migration(jsonb), public.puppy_upsert_beta_link(jsonb),
 public.puppy_seed_exchange_policy(text[]) from public, anon, authenticated;
grant execute on function public.puppy_upsert_save_head(jsonb),
 public.puppy_upsert_device_migration(jsonb), public.puppy_upsert_beta_link(jsonb),
 public.puppy_seed_exchange_policy(text[]) to service_role;
