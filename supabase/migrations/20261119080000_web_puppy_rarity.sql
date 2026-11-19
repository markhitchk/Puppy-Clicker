-- All feature tables are private. Only the filtered catalog is callable by visitors.
create schema if not exists puppy_rarity;
revoke all on schema puppy_rarity from public,anon,authenticated,service_role;

create table puppy_rarity.config (
 singleton boolean primary key default true check (singleton),
 owner_id uuid references puppy_accounts.pup_accounts(id),
 version bigint not null default 1
);
insert into puppy_rarity.config(singleton) values(true);

create table puppy_rarity.catalog (
 puppy_id text primary key references puppy_exchange.pup_exchange_transfer_policy(puppy_id),
 rarity text not null check (rarity in ('common','uncommon','rare','epic','legendary','unobtainable')),
 acquisition text not null check (acquisition in ('standard','community','event','code','developer','retired','restricted')),
 published boolean not null,
 version bigint not null default 1,
 check ((rarity='unobtainable') = (acquisition in ('developer','retired','restricted'))),
 -- The four starter IDs are implicit entitlements in released save readers.
 check (puppy_id not in ('classic','golden','poodle','spotty') or (published and acquisition='standard'))
);
insert into puppy_rarity.catalog(puppy_id,rarity,acquisition,published) values
('classic','common','standard',true),
('golden','common','standard',true),
('poodle','common','standard',true),
('spotty','common','standard',true),
('cocoa','common','standard',true),
('v2_biscuit','common','standard',true),
('cloud','uncommon','standard',true),
('snowball','uncommon','standard',true),
('v2_honey','uncommon','standard',true),
('v2_chestnut','uncommon','standard',true),
('test_v1_crash_dummy','uncommon','standard',true),
('midnight','rare','standard',true),
('v2_frost','rare','standard',true),
('v2_onyx','rare','standard',true),
('v2_domino','rare','standard',true),
('v2_flurry','rare','standard',true),
('v2_discord_pup','rare','community',true),
('test_v2_crash_dummy','rare','standard',true),
('aurora','epic','standard',true),
('neon_buddy','epic','standard',true),
('golden_night','epic','standard',true),
('halloween','epic','event',true),
('santa','epic','event',true),
('birthday','epic','event',true),
('v2_rory','epic','code',true),
('galaxy','legendary','standard',true),
('v2_prism','legendary','standard',true),
('secret_snoot','legendary','code',true),
('classic_forever','legendary','code',true),
('dev_pup','unobtainable','developer',true),
('v2_dev_pup','unobtainable','developer',true),
('v2_harleytg','unobtainable','developer',true);

create table puppy_rarity.history (
 actor uuid not null, operation_id uuid not null, action text not null,
 puppy_id text not null, target uuid, reason text not null, payload jsonb not null,
 before_value jsonb, after_value jsonb not null, catalog_version bigint not null,
 created_at timestamptz not null default now(), primary key(actor,operation_id)
);
alter table puppy_rarity.config enable row level security;
alter table puppy_rarity.catalog enable row level security;
alter table puppy_rarity.history enable row level security;
revoke all on all tables in schema puppy_rarity from public,anon,authenticated,service_role;

create function public.pup_rarity_public() returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(c)||jsonb_build_object('bound',p.bound,'giftable',p.giftable,'tradeable',p.tradeable,'source_copy',p.source_copy) order by c.puppy_id),'[]')
 from puppy_rarity.catalog c join puppy_exchange.pup_exchange_transfer_policy p using(puppy_id)
 where c.published
$$;
create function public.pup_rarity_reward_snapshot() returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('version',version,'rows',public.pup_rarity_public()) from puppy_rarity.config
$$;

create function public.pup_rarity_reward_commit(p_catalog_version bigint,p_player_uuid uuid,p_account_uuid uuid,
 p_expected_revision bigint,p_operation_id uuid,p_intent_hash text,p_intent_type text,p_save_data jsonb,p_payload_hash text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare current_version bigint;
begin
 select version into strict current_version from puppy_rarity.config for share;
 if current_version is distinct from p_catalog_version then return jsonb_build_object('status','conflict'); end if;
 return public.pup_web_gameplay_commit(p_player_uuid,p_account_uuid,p_expected_revision,p_operation_id,p_intent_hash,p_intent_type,p_save_data,p_payload_hash);
end $$;

-- Check only new entitlements. An old installed client can continue saving owned puppies.
create function puppy_rarity.guard_unlocks() returns trigger
language plpgsql security definer set search_path='' as $$
declare old_ids jsonb := '[]'; new_ids jsonb; blocked text;
begin
 if tg_op='UPDATE' then old_ids:=coalesce(old.save_data#>'{stores,puppy_clicker_save,values,unlocked_puppies}','[]'); end if;
 new_ids:=coalesce(new.save_data#>'{stores,puppy_clicker_save,values,unlocked_puppies}','[]');
 if new_ids=old_ids then return new; end if;
 perform 1 from puppy_rarity.config for share;
 select added.id into blocked from jsonb_array_elements_text(new_ids) as added(id)
 left join puppy_rarity.catalog c on c.puppy_id=added.id
 where not (old_ids ? added.id) and (c.puppy_id is null or not c.published or
  (c.rarity='unobtainable' and current_setting('puppy_rarity.grant',true)
    is distinct from new.player_uuid::text||'/'||added.id)) limit 1;
 if found then raise exception 'PUPPY_RESTRICTED'; end if;
 return new;
end $$;
create trigger pup_guard_rarity before insert or update of save_data on puppy_game.pup_account_saves
 for each row execute function puppy_rarity.guard_unlocks();

create function public.pup_rarity_manage(p_actor uuid,p_action text,p_body jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare cfg puppy_rarity.config%rowtype; entry puppy_rarity.catalog%rowtype;
 prev puppy_rarity.history%rowtype; account record; before_entry jsonb; result jsonb;
 puppy text:=p_body->>'puppyId'; reason text:=trim(p_body->>'reason'); op uuid;
begin
 select a.id,p.guild_role into strict account from puppy_accounts.pup_accounts a join puppy_pupeye.pupeye_players p on p.id=a.player_uuid
 where a.id=p_actor and a.status='active' and p.status='active';
 select * into strict cfg from puppy_rarity.config for update;
 if p_action='read' and (p_actor=cfg.owner_id or account.guild_role in ('ADMIN','MODERATOR','MOD','DEVELOPER')) then
  return jsonb_build_object('canEdit',coalesce(p_actor=cfg.owner_id,false),'rows',(select jsonb_agg(candidate order by candidate.puppy_id) from (
    select p.puppy_id,coalesce(c.rarity,'common') as rarity,coalesce(c.acquisition,'standard') as acquisition,
     coalesce(c.published,false) as published,coalesce(c.version,0) as version
    from puppy_exchange.pup_exchange_transfer_policy p left join puppy_rarity.catalog c using(puppy_id)
   ) candidate),
   'history',coalesce((select jsonb_agg(h order by h.created_at desc) from (select log.action,log.puppy_id,log.reason,log.created_at,log.before_value,log.after_value,log.target from puppy_rarity.history log order by log.created_at desc limit 100) h),'[]'));
 end if;
 if p_actor is distinct from cfg.owner_id or cfg.owner_id is null or p_action<>'update' then raise exception 'OWNER_REQUIRED'; end if;
 op:=(p_body->>'operationId')::uuid;
 if op is null or coalesce(length(reason),0) not between 1 and 300 then raise exception 'INVALID_CHANGE'; end if;
 select * into prev from puppy_rarity.history where actor=p_actor and operation_id=op;
 if found then
  if prev.payload<>p_body or prev.action<>'update' then raise exception 'OPERATION_REUSED'; end if;
  return prev.after_value;
 end if;
 select * into entry from puppy_rarity.catalog where puppy_id=puppy for update;
 if coalesce(entry.version,0) is distinct from (p_body->>'version')::bigint then raise exception 'VERSION_CONFLICT'; end if;
 if entry.puppy_id is not null then before_entry:=to_jsonb(entry); end if;
 insert into puppy_rarity.catalog(puppy_id,rarity,acquisition,published)
 values(puppy,p_body->>'rarity',p_body->>'acquisition',(p_body->>'published')::boolean)
 on conflict(puppy_id) do update set rarity=excluded.rarity,acquisition=excluded.acquisition,
  published=excluded.published,version=catalog.version+1 returning to_jsonb(catalog.*) into result;
 update puppy_rarity.config set version=version+1;
 insert into puppy_rarity.history(actor,operation_id,action,puppy_id,reason,payload,before_value,after_value,catalog_version)
 values(p_actor,op,'update',puppy,reason,p_body,before_entry,result,cfg.version+1);
 return result;
end $$;

create function public.pup_rarity_gift(p_actor uuid,p_target uuid,p_puppy text,p_operation uuid,p_reason text,p_request uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare cfg puppy_rarity.config%rowtype; entry puppy_rarity.catalog%rowtype; policy record; actor_row record;
 saved puppy_game.pup_account_saves%rowtype; prior puppy_rarity.history%rowtype; owned jsonb; updated jsonb; result jsonb;
 payload jsonb:=jsonb_build_object('target',p_target,'puppy',p_puppy,'reason',p_reason,'request',p_request);
begin
 select * into strict cfg from puppy_rarity.config for share;
 select a.player_uuid,p.guild_role into strict actor_row from puppy_accounts.pup_accounts a join puppy_pupeye.pupeye_players p on p.id=a.player_uuid
 where a.id=p_actor and a.status='active' and p.status='active';
 if actor_row.guild_role not in ('ADMIN','DEVELOPER') or actor_row.guild_role is null then raise exception 'STAFF_REQUIRED'; end if;
 if p_operation is null or coalesce(length(trim(p_reason)),0) not between 1 and 300 then raise exception 'INVALID_GIFT'; end if;
 select * into strict saved from puppy_game.pup_account_saves where player_uuid=p_target for update;
 perform 1 from puppy_accounts.pup_accounts a join puppy_pupeye.pupeye_players p on a.player_uuid=p.id
 where p.id=p_target and a.id=saved.account_uuid and p.status='active' and a.status='active';
 if not found then raise exception 'TARGET_ACCOUNT_NOT_ACTIVE'; end if;
 select * into prior from puppy_rarity.history where actor=p_actor and operation_id=p_operation;
 if found then
  if prior.payload<>payload or prior.action<>'gift' then raise exception 'OPERATION_REUSED'; end if;
  return prior.after_value;
 end if;
 select * into strict entry from puppy_rarity.catalog where puppy_id=p_puppy and published;
 select * into strict policy from puppy_exchange.pup_exchange_transfer_policy where puppy_id=p_puppy for share;
 if entry.rarity='unobtainable' or policy.bound or not policy.giftable or policy.source_copy then
  if p_actor is distinct from cfg.owner_id or cfg.owner_id is null or not exists(select 1 from puppy_exchange.pup_exchange_privileged_gifters where account_uuid=p_actor and enabled) then raise exception 'OWNER_REQUIRED'; end if;
  if p_request is not null then raise exception 'PUPPY_NOT_REQUESTABLE'; end if;
 end if;
 owned:=saved.save_data#>'{stores,puppy_clicker_save,values,unlocked_puppies}';
 if jsonb_typeof(owned) is distinct from 'array' or saved.save_data#>>'{stores,puppy_clicker_save,types,unlocked_puppies}' is distinct from 'string_set' then raise exception 'TARGET_CLOUD_SAVE_REQUIRED'; end if;
 if owned ? p_puppy then raise exception 'PUPPY_ALREADY_OWNED'; end if;
 if p_request is not null then
  update puppy_exchange.pup_gift_requests set status='approved',reviewed_at=now(),reviewed_by_player_uuid=actor_row.player_uuid,gifted_revision=saved.revision+1
  where id=p_request and status='pending' and puppy_id=p_puppy and account_uuid=saved.account_uuid and player_uuid=p_target;
  if not found then raise exception 'REQUEST_NOT_PENDING'; end if;
 end if;
 perform set_config('puppy_rarity.grant',p_target::text||'/'||p_puppy,true);
 updated:=jsonb_set(jsonb_set(saved.save_data,'{stores,puppy_clicker_save,values,unlocked_puppies}',owned||to_jsonb(p_puppy)),'{savedAtEpochMs}',to_jsonb(floor(extract(epoch from now())*1000)::bigint));
 update puppy_game.pup_account_saves set save_data=updated,revision=revision+1,updated_at=now(),
 payload_hash_sha256=encode(extensions.digest(public.pup_exchange_canonical(updated),'sha256'),'hex') where player_uuid=p_target;
 perform set_config('puppy_rarity.grant','',true);
 result:=jsonb_build_object('granted',true,'revision',saved.revision+1,'warnings','[]'::jsonb);
 insert into puppy_rarity.history(actor,operation_id,action,puppy_id,target,reason,payload,before_value,after_value,catalog_version)
 values(p_actor,p_operation,'gift',p_puppy,p_target,p_reason,payload,jsonb_build_object('revision',saved.revision),result,cfg.version);
 insert into puppy_admin.pup_admin_actions(actor_player_uuid,target_player_uuid,action_code,detail)
 values(actor_row.player_uuid,p_target,'WEB_SYSTEM_PUPPY_GRANTED',payload||result);
 insert into puppy_game.pup_system_notifications(player_uuid,created_by_player_uuid,kind,title,body,detail)
 values(p_target,actor_row.player_uuid,'developer','A puppy has joined your collection 🐾',p_puppy||' was granted to your Pup Account.',jsonb_build_object('source','web_admin_system_gift','puppyId',p_puppy));
 return result;
end $$;
revoke all on function puppy_rarity.guard_unlocks(),public.pup_rarity_public(),public.pup_rarity_reward_snapshot(),
 public.pup_rarity_manage(uuid,text,jsonb), public.pup_rarity_gift(uuid,uuid,text,uuid,text,uuid),
 public.pup_rarity_reward_commit(bigint,uuid,uuid,bigint,uuid,text,text,jsonb,text) from public,anon,authenticated,service_role;
grant execute on function public.pup_rarity_public() to anon,authenticated,service_role;
grant execute on function public.pup_rarity_manage(uuid,text,jsonb),public.pup_rarity_gift(uuid,uuid,text,uuid,text,uuid),
 public.pup_rarity_reward_commit(bigint,uuid,uuid,bigint,uuid,text,text,jsonb,text),public.pup_rarity_reward_snapshot() to service_role;
