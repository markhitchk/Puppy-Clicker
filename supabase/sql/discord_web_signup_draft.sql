-- Discord registration is atomic; callable only by the Puppy Clicker service role.
CREATE OR REPLACE FUNCTION public.register_pup_web_discord_account(p_auth_user_id uuid, p_username text, p_email text, p_discord_user_id text, p_discord_username text, p_discord_global_name text, p_discord_avatar_hash text, p_discord_email text, p_contact_email text, p_save_data jsonb, p_payload_hash text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_player_id uuid := gen_random_uuid();
  v_account_id uuid;
  v_code text := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
begin
  if p_username is null or p_username !~ '^[A-Za-z0-9_-]{3,20}$'
     or p_email is null or p_email !~ '^pup-web-[0-9a-f-]+@accounts[.]puppyclicker[.]invalid$'
     or p_discord_user_id is null or p_discord_user_id !~ '^[0-9]{15,22}$'
     or length(coalesce(p_discord_username, '')) < 1
     or length(p_discord_username) > 80
     or length(coalesce(p_discord_global_name, '')) > 80
     or (p_discord_avatar_hash is not null and
         p_discord_avatar_hash !~ '^[a-zA-Z0-9_]{1,128}$')
     or (p_discord_email is not null and
         (length(p_discord_email) > 254 or
          p_discord_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'))
     or (p_contact_email is not null and
         (length(p_contact_email) > 254 or
          p_contact_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'))
     or p_save_data is null
     or p_save_data->>'format' is distinct from 'puppy-clicker-cloud-save'
     or p_save_data->>'version' is distinct from '1'
     or p_payload_hash is null or p_payload_hash !~ '^[0-9a-f]{64}$'
     or (p_contact_email is not null and p_contact_email is distinct from p_discord_email)
  then
    raise exception 'PUP_REGISTRATION_INVALID';
  end if;

  -- Never bind an arbitrary Auth user or a user's account from another project.
  if not exists (
    select 1 from auth.users u
    where u.id = p_auth_user_id and u.email = p_email
      and u.raw_app_meta_data->>'puppy_clicker_web' = 'true'
  ) then
    raise exception 'PUP_REGISTRATION_AUTH_REQUIRED';
  end if;

  -- Serialize concurrent signups by Discord ID and username.
  perform pg_advisory_xact_lock(hashtextextended('pup-web-discord:' || p_discord_user_id, 0));
  perform pg_advisory_xact_lock(hashtextextended('pup-web:' || lower(p_username), 0));

  -- Never silently take over a Kotlin PupEye identity or existing Pup Account.
  if exists (select 1 from public.pup_accounts where discord_user_id = p_discord_user_id)
     or exists (select 1 from public.pupeye_players where discord_user_id = p_discord_user_id)
     or exists (select 1 from public.pup_web_auth_links where discord_user_id = p_discord_user_id)
  then
    raise unique_violation using message = 'PUP_DISCORD_ALREADY_LINKED';
  end if;

  if exists (select 1 from public.pup_accounts where lower(username) = lower(p_username))
     or exists (select 1 from public.pupeye_players where lower(username) = lower(p_username))
     or exists (select 1 from public.pup_credential_pending where lower(username) = lower(p_username))
  then
    raise unique_violation using message = 'PUP_USERNAME_TAKEN';
  end if;

  insert into public.pupeye_players(
    id, player_id, friend_code, username, discord_user_id,
    discord_username, discord_global_name, discord_avatar_hash, discord_email
  ) values (
    v_player_id, 'web-' || v_player_id::text,
    'PUP-' || substr(v_code, 1, 4) || '-' || substr(v_code, 5, 4) || '-' || substr(v_code, 9, 4),
    p_username, p_discord_user_id, p_discord_username,
    p_discord_global_name, p_discord_avatar_hash, p_discord_email
  );

  insert into public.pup_accounts(
    player_uuid, active_installation_uuid, discord_user_id, username,
    display_name, avatar_hash, origin_platform, contact_email,
    terms_version, privacy_version, terms_accepted_at, privacy_accepted_at
  ) values (
    v_player_id, null, p_discord_user_id, p_username,
    coalesce(nullif(p_discord_global_name, ''), p_username),
    p_discord_avatar_hash, 'web', p_contact_email,
    1, 1, now(), now()
  ) returning id into v_account_id;

  insert into public.pup_web_auth_links(account_uuid, auth_user_id, discord_user_id)
  values (v_account_id, p_auth_user_id, p_discord_user_id);

  insert into public.pup_account_saves(
    player_uuid, account_uuid, installation_uuid, origin_platform,
    revision, generation, save_schema, save_data, payload_hash_sha256
  ) values (
    v_player_id, v_account_id, null, 'web',
    1, 1, 1, p_save_data, p_payload_hash
  );

  return v_account_id;
end;
$function$
;

revoke all on function public.register_pup_web_discord_account(
  uuid,text,text,text,text,text,text,text,text,jsonb,text
) from public, anon, authenticated;
grant execute on function public.register_pup_web_discord_account(
  uuid,text,text,text,text,text,text,text,text,jsonb,text
) to service_role;
