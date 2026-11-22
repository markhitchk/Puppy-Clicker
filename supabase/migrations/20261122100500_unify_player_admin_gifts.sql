-- All gifts enter the same reward notification ledger. No production mutation until release approval.
alter table puppy_web.pup_reward_inbox drop constraint pup_reward_inbox_source_check;
alter table puppy_web.pup_reward_inbox add constraint pup_reward_inbox_source_check check(source in ('advent','referral','admin','player'));
alter table puppy_web.pup_reward_inbox add column sender_account_uuid uuid references puppy_accounts.pup_accounts(id) on delete set null;
-- An approved request is now distinct from a redeemed request.
alter table puppy_exchange.pup_gift_requests drop constraint if exists pup_gift_review_consistency;
alter table puppy_exchange.pup_gift_requests add constraint pup_gift_review_consistency check(
 (status='pending' and reviewed_at is null and reviewed_by_player_uuid is null and gifted_revision is null) or
 (status='declined' and reviewed_at is not null and reviewed_by_player_uuid is not null and gifted_revision is null) or
 (status='approved' and reviewed_at is not null and reviewed_by_player_uuid is not null)
);

-- Move the existing checked exchange gateway behind a private schema. Trades
-- retain their public confirmation path; gifts can only be redeemed by inbox.
alter function public.pup_exchange_complete(uuid,uuid) rename to pup_exchange_confirm_from_inbox;
alter function public.pup_exchange_confirm_from_inbox(uuid,uuid) set schema puppy_rarity;

revoke all on function puppy_rarity.pup_exchange_confirm_from_inbox(uuid,uuid) from public,anon,authenticated,service_role;
create function public.pup_exchange_complete(p_offer uuid,p_actor uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from puppy_exchange.pup_exchange_offers where id=p_offer and kind='gift') then
  raise exception 'EXCHANGE_NOTIFICATION_REQUIRED';
 end if;
 return puppy_rarity.pup_exchange_confirm_from_inbox(p_offer,p_actor);
end $$;
revoke all on function public.pup_exchange_complete(uuid,uuid) from public,anon,authenticated;
grant execute on function public.pup_exchange_complete(uuid,uuid) to service_role;

-- Materialize active incoming offers, including offers sent before this migration.
-- An offer remains cancelable/declinable/expirable until the recipient claims it.
create function public.pup_player_gift_inbox_sync(p_account uuid)
returns void language sql security definer set search_path='' as $$
 insert into puppy_web.pup_reward_inbox(id,account_uuid,source,source_key,reward_key,amount,puppy_id,label,sender_account_uuid,created_at)
 select o.id,o.recipient,'player',o.id::text,'puppy',1,o.offered[1],'Puppy: '||replace(o.offered[1],'_',' '),o.sender,o.created_at
 from puppy_exchange.pup_exchange_offers o
 where o.recipient=p_account and o.kind='gift' and o.state='pending' and o.expires_at>now() and cardinality(o.offered)=1
 on conflict(account_uuid,source,source_key) do nothing
$$;
revoke all on function public.pup_player_gift_inbox_sync(uuid) from public,anon,authenticated;
grant execute on function public.pup_player_gift_inbox_sync(uuid) to service_role;

create or replace function public.pup_rarity_gift(p_actor uuid,p_target uuid,p_puppy text,p_operation uuid,p_reason text,p_request uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare cfg puppy_rarity.config%rowtype; entry puppy_rarity.catalog%rowtype; policy record; actor_row record;
 saved puppy_game.pup_account_saves%rowtype; prior puppy_rarity.history%rowtype; owned jsonb; updated jsonb; result jsonb; gift_id uuid;
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
 if owned ? p_puppy or exists(select 1 from puppy_web.pup_reward_inbox q where q.account_uuid=saved.account_uuid and q.puppy_id=p_puppy and q.claimed_at is null and q.source<>'player') then raise exception 'PUPPY_ALREADY_OWNED'; end if;
 if p_request is not null then
  update puppy_exchange.pup_gift_requests set status='approved',reviewed_at=now(),reviewed_by_player_uuid=actor_row.player_uuid,gifted_revision=null
  where id=p_request and status='pending' and puppy_id=p_puppy and account_uuid=saved.account_uuid and player_uuid=p_target;
  if not found then raise exception 'REQUEST_NOT_PENDING'; end if;
 end if;
 insert into puppy_web.pup_reward_inbox(account_uuid,source,source_key,reward_key,amount,puppy_id,label,sender_account_uuid)
 values(saved.account_uuid,'admin',p_actor::text||':'||p_operation::text,'puppy',1,p_puppy,'Puppy: '||replace(p_puppy,'_',' '),p_actor) returning id into gift_id;
 result:=jsonb_build_object('queued',true,'notificationId',gift_id,'warnings','[]'::jsonb);
 insert into puppy_rarity.history(actor,operation_id,action,puppy_id,target,reason,payload,before_value,after_value,catalog_version)
 values(p_actor,p_operation,'gift',p_puppy,p_target,p_reason,payload,jsonb_build_object('revision',saved.revision),result,cfg.version);
 insert into puppy_admin.pup_admin_actions(actor_player_uuid,target_player_uuid,action_code,detail)
 values(actor_row.player_uuid,p_target,'WEB_SYSTEM_PUPPY_QUEUED',payload||result);
 return result;
end $$;

create or replace function public.pup_reward_inbox(p_account uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'kind','reward','title',case source when 'advent' then 'Santa Paws Advent gift' when 'admin' then 'System gift' when 'player' then 'Gift from a player' else 'Invite reward earned' end,
 'body',case when source='player' then 'From @'||coalesce((select a.username from puppy_accounts.pup_accounts a where a.id=q.sender_account_uuid),'Player')||': ' else '' end||label||'. Claim your reward to add it to your collection or balance.'||
 case when reward_key='puppy' and source in ('referral','advent') then ' If already owned or unavailable, you receive Treats instead.' else '' end,
 'createdAt',created_at,'read',read_at is not null,'claimable',true) order by created_at),'[]'::jsonb)
 from (select * from puppy_web.pup_reward_inbox where account_uuid=p_account and claimed_at is null and (source<>'player' or exists(select 1 from puppy_exchange.pup_exchange_offers o where o.id::text=source_key and o.recipient=p_account and o.kind='gift' and o.state='pending' and o.expires_at>now())) order by created_at,id limit 50) q
$$;

create or replace function public.pup_reward_redeem(p_account uuid,p_id uuid,p_revision bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s puppy_game.pup_account_saves%rowtype; q puppy_web.pup_reward_inbox%rowtype;
 updated jsonb; v jsonb; owned jsonb; k text; n integer; lbl text; counter numeric; fields text[]; offer puppy_exchange.pup_exchange_offers%rowtype; cfg puppy_rarity.config%rowtype; restricted boolean; entry puppy_rarity.catalog%rowtype;
begin
 select * into strict cfg from puppy_rarity.config for share;
 -- Player gifts use the existing copy entitlement transaction. Lock the offer
 -- before any save, preserving the exchange lock order and all policy checks.
 select * into q from puppy_web.pup_reward_inbox where id=p_id and account_uuid=p_account;
 if found and q.source='player' then
  select * into offer from puppy_exchange.pup_exchange_offers where id=q.source_key::uuid for update;
  if not found or offer.recipient<>p_account or offer.kind<>'gift' then return jsonb_build_object('status','REWARD_NOT_FOUND'); end if;
  select * into q from puppy_web.pup_reward_inbox where id=p_id and account_uuid=p_account for update;
  if q.claimed_at is not null or offer.state='completed' then return jsonb_build_object('status','duplicate','label',q.label); end if;
  if offer.state<>'pending' or offer.expires_at<=now() then return jsonb_build_object('status','REWARD_GIFT_CLOSED'); end if;
  begin
   perform puppy_rarity.pup_exchange_confirm_from_inbox(offer.id,p_account);
  exception when raise_exception then
   if SQLERRM in ('EXCHANGE_OFFER_NOT_PENDING','EXCHANGE_OFFER_EXPIRED','EXCHANGE_CONFIRMATION_REQUIRED','EXCHANGE_FRIENDSHIP_REQUIRED','EXCHANGE_BLOCKED','EXCHANGE_ACCOUNT_NOT_ELIGIBLE','EXCHANGE_CLOUD_SAVE_REQUIRED','EXCHANGE_CLOUD_SAVE_UNSUPPORTED','EXCHANGE_INVENTORY_INVALID','EXCHANGE_GIFT_INVALID','EXCHANGE_INVALID_CONTENTS','EXCHANGE_SENDER_INVENTORY_INVALID','EXCHANGE_PUPPY_NOT_TRANSFERABLE','PUPPY_RESTRICTED','OWNER_REQUIRED') then
    return jsonb_build_object('status','REWARD_GIFT_INELIGIBLE');
   end if;
   raise;
  end;
  update puppy_web.pup_reward_inbox set claimed_at=now(),read_at=coalesce(read_at,now()),claimed_label=q.label where id=p_id;
  return jsonb_build_object('status','saved','label',q.label);
 end if;
 select * into s from puppy_game.pup_account_saves where account_uuid=p_account for update;
 if not found then return jsonb_build_object('status','CLOUD_SAVE_REQUIRED'); end if;
 select * into q from puppy_web.pup_reward_inbox where id=p_id and account_uuid=p_account for update;
 if not found then return jsonb_build_object('status','REWARD_NOT_FOUND'); end if;
 if q.claimed_at is not null then return jsonb_build_object('status','duplicate','label',q.claimed_label); end if;
 if s.revision<>p_revision then return jsonb_build_object('status','CLOUD_SAVE_CONFLICT'); end if;
 updated:=s.save_data;k:=q.reward_key;n:=q.amount;lbl:=q.label;
 if updated->>'format' is distinct from 'puppy-clicker-cloud-save' or jsonb_typeof(updated#>'{stores,puppy_clicker_save,values}') is distinct from 'object' or jsonb_typeof(updated#>'{stores,puppy_clicker_save,types}') is distinct from 'object' then raise exception 'INVALID_REWARD_SAVE'; end if;
 if k='puppy' then
  owned:=updated#>'{stores,puppy_clicker_save,values,unlocked_puppies}';
  if jsonb_typeof(owned) is distinct from 'array' then raise exception 'INVALID_REWARD_SAVE'; end if;
  if q.source='admin' then
   select * into entry from puppy_rarity.catalog where puppy_id=q.puppy_id and published;
   if not found then return jsonb_build_object('status','REWARD_GIFT_INELIGIBLE'); end if;
   select entry.rarity='unobtainable' or p.bound or not p.giftable or p.source_copy into restricted
    from puppy_exchange.pup_exchange_transfer_policy p where p.puppy_id=q.puppy_id for share;
   if not found then return jsonb_build_object('status','REWARD_GIFT_INELIGIBLE'); end if;
   if restricted and (q.sender_account_uuid is distinct from cfg.owner_id or cfg.owner_id is null or not exists(
    select 1 from puppy_exchange.pup_exchange_privileged_gifters g join puppy_accounts.pup_accounts a on a.id=g.account_uuid
    join puppy_pupeye.pupeye_players p on p.id=a.player_uuid
    where g.account_uuid=q.sender_account_uuid and g.enabled and a.status='active' and p.status='active' and p.guild_role in ('ADMIN','DEVELOPER')
   )) then return jsonb_build_object('status','REWARD_GIFT_INELIGIBLE'); end if;
   if owned ? q.puppy_id then
    update puppy_web.pup_reward_inbox set claimed_at=now(),read_at=coalesce(read_at,now()),claimed_label='Already owned' where id=p_id;
    update puppy_exchange.pup_gift_requests set gifted_revision=s.revision where id::text=split_part(q.source_key,':',2) and account_uuid=p_account and status='approved' and gifted_revision is null;
    return jsonb_build_object('status','saved','label','Already owned');
   end if;
   if restricted then perform set_config('puppy_rarity.grant',s.player_uuid::text||'/'||q.puppy_id,true); end if;
   updated:=jsonb_set(updated,'{stores,puppy_clicker_save,values,unlocked_puppies}',owned||to_jsonb(q.puppy_id));
  elsif owned ? q.puppy_id or not exists(select 1 from puppy_rarity.catalog c where c.puppy_id=q.puppy_id and c.published and c.rarity<>'unobtainable' and c.acquisition in ('standard','event')) then
   k:='treats'; n:=1000; lbl:='1,000 Treats (puppy replacement)';
  else updated:=jsonb_set(updated,'{stores,puppy_clicker_save,values,unlocked_puppies}',owned||to_jsonb(q.puppy_id)); end if;
 end if;
 if k<>'puppy' then
  fields:=case when k='treats' then array[k,'lifetime_treats'] when k like 'upgrade_ticket_%' then array[k,'total_tickets_found'] else array[k] end;
  foreach k in array fields loop
   v:=coalesce(updated#>array['stores','puppy_clicker_save','values',k],'0'::jsonb);
   if jsonb_typeof(v)<>'number' then raise exception 'INVALID_REWARD_COUNTER'; end if;
   counter:=(v#>>'{}')::numeric;
   if counter<0 or counter<>trunc(counter) or counter+n>9007199254740991 or (k like 'upgrade_ticket_%' and counter+n>9999) then return jsonb_build_object('status','REWARD_BALANCE_LIMIT'); end if;
   updated:=jsonb_set(updated,array['stores','puppy_clicker_save','values',k],to_jsonb((counter+n)::bigint));
   updated:=jsonb_set(updated,array['stores','puppy_clicker_save','types',k],to_jsonb(case when k like 'upgrade_ticket_%' then 'int' else 'long' end));
  end loop;
 end if;
 updated:=jsonb_set(updated,'{savedAtEpochMs}',to_jsonb(floor(extract(epoch from now())*1000)::bigint));
 update puppy_game.pup_account_saves set save_data=updated,revision=revision+1,updated_at=now(),payload_hash_sha256=encode(extensions.digest(public.pup_exchange_canonical(updated),'sha256'),'hex') where account_uuid=p_account and player_uuid=s.player_uuid;
 if q.source='admin' then
  perform set_config('puppy_rarity.grant','',true);
  update puppy_exchange.pup_gift_requests set gifted_revision=s.revision+1 where id::text=split_part(q.source_key,':',2) and account_uuid=p_account and status='approved' and gifted_revision is null;
  insert into puppy_admin.pup_admin_actions(actor_player_uuid,target_player_uuid,action_code,detail)
  select a.player_uuid,s.player_uuid,'WEB_SYSTEM_GIFT_CLAIMED',jsonb_build_object('notificationId',p_id,'reward',lbl,'revision',s.revision+1)
  from puppy_accounts.pup_accounts a where a.id=q.sender_account_uuid;
 end if;
 update puppy_web.pup_reward_inbox set claimed_at=now(),read_at=coalesce(read_at,now()),claimed_label=lbl where id=p_id;
 return jsonb_build_object('status','saved','label',lbl);
end $$;


-- Staff-created resource gifts use the same inbox and one-item claim transaction.
create function public.pup_admin_resource_gift(p_actor uuid,p_target uuid,p_key text,p_amount integer,p_operation uuid,p_reason text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor_player uuid; target_account uuid; q puppy_web.pup_reward_inbox%rowtype; label_text text; gift_id uuid; max_amount integer;
begin
 select a.player_uuid into actor_player from puppy_accounts.pup_accounts a join puppy_pupeye.pupeye_players p on p.id=a.player_uuid
 where a.id=p_actor and a.status='active' and p.status='active' and p.guild_role in ('ADMIN','DEVELOPER');
 if not found then raise exception 'STAFF_REQUIRED'; end if;
 if p_key not in ('treats','bones_v7','pup_coins_v7','casino_chips_v7','upgrade_ticket_common','upgrade_ticket_uncommon','upgrade_ticket_rare','upgrade_ticket_epic','upgrade_ticket_legendary') or p_key is null or p_operation is null or coalesce(length(trim(p_reason)),0) not between 1 and 300 then raise exception 'INVALID_GIFT'; end if;
 max_amount:=case when p_key like 'upgrade_ticket_%' then 100 when p_key='treats' then 10000 else 1000 end;
 if p_amount is null or p_amount not between 1 and max_amount then raise exception 'INVALID_GIFT'; end if;
 select a.id into target_account from puppy_accounts.pup_accounts a join puppy_pupeye.pupeye_players p on p.id=a.player_uuid
 join puppy_game.pup_account_saves s on s.account_uuid=a.id and s.player_uuid=p.id
 where p.id=p_target and p.status='active' and a.status='active' for update of s;
 if not found then raise exception 'TARGET_CLOUD_SAVE_REQUIRED'; end if;
 select * into q from puppy_web.pup_reward_inbox where account_uuid=target_account and source='admin' and source_key=p_actor::text||':'||p_operation::text;
 if found then
  if q.reward_key<>p_key or q.amount<>p_amount then raise exception 'OPERATION_REUSED'; end if;
  return jsonb_build_object('queued',true,'notificationId',q.id);
 end if;
 label_text:=case p_key when 'treats' then p_amount||' Treats' when 'bones_v7' then p_amount||' Bones' when 'pup_coins_v7' then p_amount||' Pup Coins' when 'casino_chips_v7' then p_amount||' Casino Chips' else p_amount||' '||initcap(replace(p_key,'upgrade_ticket_',''))||' Upgrade Ticket(s)' end;
 insert into puppy_web.pup_reward_inbox(account_uuid,source,source_key,reward_key,amount,label,sender_account_uuid)
 values(target_account,'admin',p_actor::text||':'||p_operation::text,p_key,p_amount,label_text,p_actor) returning id into gift_id;
 insert into puppy_admin.pup_admin_actions(actor_player_uuid,target_player_uuid,action_code,detail)
 values(actor_player,p_target,'WEB_SYSTEM_RESOURCE_GIFT_QUEUED',jsonb_build_object('notificationId',gift_id,'reward',p_key,'amount',p_amount,'reason',p_reason));
 return jsonb_build_object('queued',true,'notificationId',gift_id);
end $$;
revoke all on function public.pup_admin_resource_gift(uuid,uuid,text,integer,uuid,text) from public,anon,authenticated;
grant execute on function public.pup_admin_resource_gift(uuid,uuid,text,integer,uuid,text) to service_role;

notify pgrst,'reload schema';
