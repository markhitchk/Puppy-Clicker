
-- Shared durable reward inbox: one reward per event door / qualifying referral.
-- Existing direct-reward referral receipts remain historical; never pay them twice.
create table puppy_web.pup_reward_inbox(
 id uuid primary key default gen_random_uuid(),
 account_uuid uuid not null references puppy_accounts.pup_accounts(id) on delete cascade,
 source text not null check(source in ('advent','referral')),
 source_key text not null,
 reward_key text not null check(reward_key in ('treats','bones_v7','pup_coins_v7','casino_chips_v7','upgrade_ticket_common','upgrade_ticket_uncommon','upgrade_ticket_rare','upgrade_ticket_epic','upgrade_ticket_legendary','puppy')),
 amount integer not null check(amount between 1 and 10000),
 puppy_id text,
 label text not null,
 created_at timestamptz not null default now(),
 read_at timestamptz,
 claimed_at timestamptz,
 claimed_label text,
 unique(account_uuid,source,source_key),
 check((reward_key='puppy')=(puppy_id is not null)),
 check(reward_key<>'puppy' or amount=1)
);
alter table puppy_web.pup_reward_inbox enable row level security;
revoke all on puppy_web.pup_reward_inbox from public,anon,authenticated,service_role;
create index pup_reward_inbox_pending_idx on puppy_web.pup_reward_inbox(account_uuid,created_at) where claimed_at is null;

-- Private helper. Source and ordinal are derived on the server, not the client.
create function puppy_web.queue_one_reward(p_account uuid,p_source text,p_key text,p_ordinal integer,p_save jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare k text; n integer; pup text; lbl text; result uuid; slot integer;
begin
 if p_source='advent' then
  if p_ordinal in (10,20,25) then k:='puppy'; n:=1;
  elsif p_ordinal in (5,15,24) then k:='upgrade_ticket_rare'; n:=1;
  else slot:=p_ordinal%5;
   k:=(array['treats','bones_v7','pup_coins_v7','casino_chips_v7','upgrade_ticket_common'])[slot+1];
   n:=(array[500+p_ordinal*25,5,10,100,1])[slot+1];
  end if;
 else
  slot:=(p_ordinal-1)%6;
  k:=(array['treats','upgrade_ticket_common','bones_v7','pup_coins_v7','casino_chips_v7','puppy'])[slot+1];
  n:=(array[500,1,5,10,100,1])[slot+1];
 end if;
 if k='puppy' then
  select c.puppy_id into pup from puppy_rarity.catalog c
  where c.published and c.rarity in ('common','uncommon','rare','epic','legendary')
   and ((p_source='advent' and c.puppy_id in ('snowball','v2_frost','v2_flurry','santa')) or
        (p_source='referral' and c.acquisition='standard' and c.rarity in ('common','uncommon','rare') and c.puppy_id not like 'test_%'))
   and not (coalesce(p_save#>'{stores,puppy_clicker_save,values,unlocked_puppies}','[]') ? c.puppy_id)
   and not exists(select 1 from puppy_web.pup_reward_inbox q where q.account_uuid=p_account and q.claimed_at is null and q.puppy_id=c.puppy_id)
  order by case when p_source='advent' and p_ordinal=25 and c.puppy_id='santa' then 0 when p_source='advent' and c.puppy_id='santa' then 2 else 1 end,c.rarity,c.puppy_id limit 1;
  if pup is null then k:='treats'; n:=case when p_source='advent' and p_ordinal=25 then 10000 else 1000 end; end if;
 end if;
 lbl:=case k when 'puppy' then 'Puppy: '||replace(pup,'_',' ')
 when 'treats' then n||' Treats' when 'bones_v7' then n||' Bones'
 when 'pup_coins_v7' then n||' Pup Coins' when 'casino_chips_v7' then n||' Casino Chips'
 else n||' '||initcap(replace(k,'upgrade_ticket_',''))||' Upgrade Ticket' end;
 insert into puppy_web.pup_reward_inbox(account_uuid,source,source_key,reward_key,amount,puppy_id,label)
 values(p_account,p_source,p_key,k,n,pup,lbl) on conflict(account_uuid,source,source_key) do nothing returning id into result;
 return result;
end $$;

-- Opening a door updates its existing cloud marker and queues exactly one reward atomically.
create function public.pup_advent_queue(p_account uuid,p_day text,p_revision bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s puppy_game.pup_account_saves%rowtype; claims jsonb; updated jsonb; day_num integer; settings jsonb;
begin
 if p_day !~ '^2026-12-(0[1-9]|1[0-9]|2[0-5])$' then return jsonb_build_object('status','ADVENT_DAY_INVALID'); end if;
 perform 1 from puppy_rarity.config for share;
 select * into s from puppy_game.pup_account_saves where account_uuid=p_account for update;
 if not found then return jsonb_build_object('status','CLOUD_SAVE_REQUIRED'); end if;
 claims:=coalesce(s.save_data#>'{stores,puppy_clicker_save,values,web_advent_2026_claimed_v1}','[]');
 if jsonb_typeof(claims)<>'array' then raise exception 'INVALID_ADVENT_SAVE'; end if;
 if claims ? p_day or exists(select 1 from puppy_web.pup_reward_inbox where account_uuid=p_account and source='advent' and source_key=p_day) then
  return jsonb_build_object('status','duplicate');
 end if;
 if s.revision<>p_revision then return jsonb_build_object('status','CLOUD_SAVE_CONFLICT'); end if;
 settings:=public.pup_event_settings_public();
 if not coalesce((settings->>'all_events')::boolean,false) or not coalesce((settings->>'christmas_2026')::boolean,false) then return jsonb_build_object('status','ADVENT_DISABLED'); end if;
 if now()<'2026-12-01 00:00:00+00'::timestamptz or now()>='2026-12-26 00:00:00+00'::timestamptz then return jsonb_build_object('status','ADVENT_CLOSED'); end if;
 if now()<(p_day||' 00:00:00+00')::timestamptz then return jsonb_build_object('status','ADVENT_DAY_LOCKED'); end if;
 day_num:=right(p_day,2)::integer;
 perform puppy_web.queue_one_reward(p_account,'advent',p_day,day_num,s.save_data);
 updated:=jsonb_set(s.save_data,'{stores,puppy_clicker_save,values,web_advent_2026_claimed_v1}',claims||to_jsonb(p_day));
 updated:=jsonb_set(updated,'{stores,puppy_clicker_save,types,web_advent_2026_claimed_v1}',to_jsonb('string_set'::text));
 updated:=jsonb_set(updated,'{savedAtEpochMs}',to_jsonb(floor(extract(epoch from now())*1000)::bigint));
 update puppy_game.pup_account_saves set save_data=updated,revision=revision+1,updated_at=now(),payload_hash_sha256=encode(extensions.digest(public.pup_exchange_canonical(updated),'sha256'),'hex') where player_uuid=s.player_uuid and account_uuid=p_account;
 return jsonb_build_object('status','saved');
end $$;

-- Queue the next qualifying invite automatically on inbox/account refresh.
-- One outstanding referral gift at a time; no bulk claim or client-controlled quantity.
create or replace function public.pup_referral_claim(p_inviter uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s puppy_game.pup_account_saves%rowtype; invited uuid; ordinal integer;
begin
 perform 1 from puppy_rarity.config for share;
 select * into s from puppy_game.pup_account_saves where account_uuid=p_inviter for update;
 if not found then return jsonb_build_object('queued',0); end if;
 if exists(select 1 from puppy_web.pup_reward_inbox where account_uuid=p_inviter and source='referral' and claimed_at is null) then return jsonb_build_object('queued',0); end if;
 select r.invited_id into invited from puppy_web.referral_rows(p_inviter) r
 where r.progress='ready' and not exists(select 1 from puppy_web.pup_reward_inbox q where q.account_uuid=p_inviter and q.source='referral' and q.source_key=r.invited_id::text)
 order by r.joined_at,r.invited_id limit 1;
 if invited is null then return jsonb_build_object('queued',0); end if;
 select (count(*)+1)::integer into ordinal from puppy_web.pup_reward_inbox where account_uuid=p_inviter and source='referral';
 perform puppy_web.queue_one_reward(p_inviter,'referral',invited::text,ordinal,s.save_data);
 return jsonb_build_object('queued',1);
end $$;

create or replace function public.pup_referral_status(p_inviter uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 with rows as materialized(
 select r.*,case when q.claimed_at is not null then 'rewarded' when q.id is not null then 'queued' else r.progress end as state,
 coalesce(q.claimed_label,q.label,case when r.paid>0 then r.paid||' Treats' end) as reward
 from puppy_web.referral_rows(p_inviter) r left join puppy_web.pup_reward_inbox q
 on q.account_uuid=p_inviter and q.source='referral' and q.source_key=r.invited_id::text)
 select jsonb_build_object('total',count(*),'ready',count(*) filter(where state='ready'),
 'pending',count(*) filter(where state='pending'),'queued',count(*) filter(where state='queued'),
 'rewarded',count(*) filter(where state='rewarded'),
 'history',coalesce((select jsonb_agg(jsonb_build_object('username',username,'joinedAt',joined_at,'status',state,'reward',reward) order by joined_at desc)
 from (select * from rows order by joined_at desc,invited_id limit 50) recent),'[]'::jsonb))
 from rows
$$;

create function public.pup_reward_inbox(p_account uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'kind','reward','title',case source when 'advent' then 'Santa Paws Advent gift' else 'Invite reward earned' end,
 'body',label||'. Claim your reward to add it to your collection or balance.'||
 case when reward_key='puppy' then ' If already owned or unavailable, you receive Treats instead.' else '' end,
 'createdAt',created_at,'read',read_at is not null,'claimable',true) order by created_at),'[]'::jsonb)
 from (select * from puppy_web.pup_reward_inbox where account_uuid=p_account and claimed_at is null order by created_at,id limit 50) q
$$;
create function public.pup_reward_inbox_read(p_account uuid,p_id uuid default null)
returns void language sql security definer set search_path='' as $$
 update puppy_web.pup_reward_inbox set read_at=coalesce(read_at,now()) where account_uuid=p_account and claimed_at is null and (p_id is null or id=p_id)
$$;

-- Single notification redemption, serialized with all other cloud mutations by revision.
create function public.pup_reward_redeem(p_account uuid,p_id uuid,p_revision bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s puppy_game.pup_account_saves%rowtype; q puppy_web.pup_reward_inbox%rowtype;
 updated jsonb; v jsonb; owned jsonb; k text; n integer; lbl text; counter numeric; fields text[];
begin
 perform 1 from puppy_rarity.config for share;
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
  if owned ? q.puppy_id or not exists(select 1 from puppy_rarity.catalog c where c.puppy_id=q.puppy_id and c.published and c.rarity<>'unobtainable' and c.acquisition in ('standard','event')) then
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
 update puppy_web.pup_reward_inbox set claimed_at=now(),read_at=coalesce(read_at,now()),claimed_label=lbl where id=p_id;
 return jsonb_build_object('status','saved','label',lbl);
end $$;
revoke all on function puppy_web.queue_one_reward(uuid,text,text,integer,jsonb) from public,anon,authenticated,service_role;
revoke all on function public.pup_advent_queue(uuid,text,bigint),public.pup_reward_inbox(uuid),public.pup_reward_inbox_read(uuid,uuid),public.pup_reward_redeem(uuid,uuid,bigint) from public,anon,authenticated;
grant execute on function public.pup_advent_queue(uuid,text,bigint),public.pup_reward_inbox(uuid),public.pup_reward_inbox_read(uuid,uuid),public.pup_reward_redeem(uuid,uuid,bigint) to service_role;
notify pgrst,'reload schema';
