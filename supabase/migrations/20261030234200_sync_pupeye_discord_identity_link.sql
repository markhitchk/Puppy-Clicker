-- Follow-up to link_existing_pup_account_discord: mirror the Android PupEye identity ledger.
-- Link a Discord identity to the authenticated Pup Account in one transaction.
-- Only the trusted pup-web-auth Edge Function calls this service-role-only RPC.
-- The RPC never accepts an auth user or player UUID from a browser.
create or replace function public.pup_web_link_discord_identity(
  p_account_uuid uuid,
  p_discord_user_id text,
  p_discord_username text,
  p_discord_global_name text,
  p_discord_avatar_hash text,
  p_discord_email text
)
returns text
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_player_uuid uuid;
  v_account_discord text;
  v_player_discord text;
  v_web_discord text;
begin
  if p_discord_user_id is null or p_discord_user_id !~ '^[0-9]{15,22}$' then
    raise exception 'PUP_DISCORD_ID_INVALID';
  end if;
  if p_discord_username is null or char_length(p_discord_username) not between 1 and 80
     or char_length(coalesce(p_discord_global_name,'')) > 100
     or char_length(coalesce(p_discord_avatar_hash,'')) > 200
     or char_length(coalesce(p_discord_email,'')) > 254 then
    raise exception 'PUP_DISCORD_PROFILE_INVALID';
  end if;

  -- Lock this account and its web auth link before changing any identity.
  select a.player_uuid, a.discord_user_id, l.discord_user_id
    into v_player_uuid, v_account_discord, v_web_discord
    from puppy_accounts.pup_accounts a
    join puppy_accounts.pup_web_auth_links l on l.account_uuid = a.id
    where a.id = p_account_uuid and a.status = 'active'
    for update of a, l;
  if not found then
    raise exception 'PUP_ACCOUNT_LINK_UNAVAILABLE';
  end if;

  select discord_user_id into v_player_discord
    from puppy_pupeye.pupeye_players
    where id = v_player_uuid and status = 'active'
    for update;
  if not found then
    raise exception 'PUP_ACCOUNT_LINK_UNAVAILABLE';
  end if;

  if v_account_discord is not null or v_web_discord is not null or v_player_discord is not null then
    if v_account_discord = p_discord_user_id
       and v_web_discord = p_discord_user_id
       and v_player_discord = p_discord_user_id then
      return 'already_linked';
    end if;
    raise exception 'PUP_ACCOUNT_DISCORD_ALREADY_LINKED';
  end if;

  -- All three authoritative identity records must agree; these checks plus
  -- per-table UNIQUE constraints prevent taking another user's Discord ID.
  if exists (select 1 from puppy_accounts.pup_accounts
             where discord_user_id = p_discord_user_id)
    or exists (select 1 from puppy_pupeye.pupeye_players
               where discord_user_id = p_discord_user_id)
    or exists (select 1 from puppy_accounts.pup_web_auth_links
               where discord_user_id = p_discord_user_id)
    or exists (select 1 from puppy_pupeye.pupeye_identity_links
               where link_type = 'PLAYER_DISCORD'
                 and discord_user_id = p_discord_user_id
                 and player_uuid <> v_player_uuid) then
    raise exception 'PUP_DISCORD_ALREADY_LINKED';
  end if;

  update puppy_pupeye.pupeye_players
    set discord_user_id = p_discord_user_id,
        discord_username = p_discord_username,
        discord_global_name = p_discord_global_name,
        discord_avatar_hash = p_discord_avatar_hash,
        discord_email = p_discord_email,
        updated_at = now()
    where id = v_player_uuid;
  update puppy_accounts.pup_accounts
    set discord_user_id = p_discord_user_id, updated_at = now()
    where id = p_account_uuid;
  update puppy_accounts.pup_web_auth_links
    set discord_user_id = p_discord_user_id
    where account_uuid = p_account_uuid;
  -- Android's PupEye Discord flow writes this same authoritative link.
  insert into puppy_pupeye.pupeye_identity_links
    (link_type, player_uuid, discord_user_id, confidence, evidence_code)
    values ('PLAYER_DISCORD', v_player_uuid, p_discord_user_id,
            'authoritative', 'DISCORD_OAUTH_USERS_ME')
    on conflict do nothing;
  return 'linked';
exception when unique_violation then
  raise exception 'PUP_DISCORD_ALREADY_LINKED';
end;
$function$;

revoke all on function public.pup_web_link_discord_identity(
  uuid,text,text,text,text,text
) from public, anon, authenticated;
grant execute on function public.pup_web_link_discord_identity(
  uuid,text,text,text,text,text
) to service_role;
