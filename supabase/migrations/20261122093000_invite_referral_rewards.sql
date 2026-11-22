-- Staged deployment SQL: apply before deploying pup-web-auth and the website.
-- Existing discovery source/details and registration records are preserved.

alter table puppy_web.pup_registration_sources alter column source drop not null;
-- Expand the existing source check without changing stored historical answers.
alter table puppy_web.pup_registration_sources drop constraint if exists pup_registration_sources_source_check;
alter table puppy_web.pup_registration_sources add constraint pup_registration_sources_source_check
 check (source in ('friend','discord','youtube','tiktok','instagram','reddit','google','play_store','other','snapchat','facebook','x','twitch'));
alter table puppy_web.pup_registration_sources add column if not exists registration_method text check (registration_method in ('password','discord'));
alter table puppy_web.pup_registration_sources add column if not exists inviter_account_uuid uuid references puppy_accounts.pup_accounts(id) on delete set null;
alter table puppy_web.pup_registration_sources enable row level security;
revoke all on puppy_web.pup_registration_sources from public, anon, authenticated;
grant select, insert on puppy_web.pup_registration_sources to service_role;
create or replace view public.pup_registration_sources with (security_invoker = true) as
 select account_uuid,source,details,created_at,registration_method,inviter_account_uuid from puppy_web.pup_registration_sources;
revoke all on public.pup_registration_sources from public, anon, authenticated;
grant select, insert on public.pup_registration_sources to service_role;
notify pgrst,'reload schema';

-- Referral rewards: a service-only, one-receipt-per-new-account ledger.
create table if not exists puppy_web.pup_referral_rewards(
 invited_account_uuid uuid primary key references puppy_accounts.pup_accounts(id) on delete cascade,
 inviter_account_uuid uuid not null references puppy_accounts.pup_accounts(id) on delete cascade,
 treats integer not null check(treats > 0),
 claimed_at timestamptz not null default now(),
 check(invited_account_uuid <> inviter_account_uuid)
);
alter table puppy_web.pup_referral_rewards enable row level security;
revoke all on puppy_web.pup_referral_rewards from public,anon,authenticated;
create index if not exists pup_registration_inviter_idx on puppy_web.pup_registration_sources(inviter_account_uuid,created_at desc);
create index if not exists pup_referral_rewards_inviter_idx on puppy_web.pup_referral_rewards(inviter_account_uuid);
-- Only verified new-account attribution counts; no manually entered discovery text.
create or replace function puppy_web.referral_rows(p_inviter uuid)
returns table(invited_id uuid,username text,joined_at timestamptz,progress text,paid integer)
language sql stable security definer set search_path='' as $$
 select a.id,a.username::text,r.created_at,
 case when rr.invited_account_uuid is not null then 'rewarded'
 when a.status <> 'active' or p.status is distinct from 'active' then 'ineligible'
 when r.created_at <= now()-interval '24 hours'
  and s.origin_platform='web'
  and s.installation_uuid is null
  and case when jsonb_typeof(s.save_data#>'{stores,puppy_clicker_save,values,legitimate_taps_v7}')='number'
   then (s.save_data#>>'{stores,puppy_clicker_save,values,legitimate_taps_v7}')::numeric >=100 else false end
 then 'ready' else 'pending' end,
 coalesce(rr.treats,0)
 from puppy_web.pup_registration_sources r
 join puppy_accounts.pup_accounts a on a.id=r.account_uuid
 left join puppy_pupeye.pupeye_players p on p.id=a.player_uuid
 left join puppy_game.pup_account_saves s on s.account_uuid=a.id and s.player_uuid=a.player_uuid
 left join puppy_web.pup_referral_rewards rr on rr.invited_account_uuid=a.id
 where r.inviter_account_uuid=p_inviter and a.id<>p_inviter
 and r.registration_method in ('password','discord')
$$;
revoke all on function puppy_web.referral_rows(uuid) from public,anon,authenticated,service_role;

create or replace function public.pup_referral_status(p_inviter uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 with rows as materialized(select * from puppy_web.referral_rows(p_inviter))
 select jsonb_build_object(
 'total',count(*),'ready',count(*) filter(where progress='ready'),
 'pending',count(*) filter(where progress='pending'),
 'rewarded',count(*) filter(where progress='rewarded'),
 'earned',coalesce(sum(paid),0),'rewardPerInvite',500,
 'history',coalesce((select jsonb_agg(jsonb_build_object('username', username,'joinedAt',joined_at,'status',progress,'treats',paid) order by joined_at desc)
 from (select * from rows order by joined_at desc,invited_id limit 50) recent),'[]'::jsonb))
 from rows
$$;
-- Serialize all claims by locking the owner's real cloud save first. The ledger,
-- balance, lifetime balance and revision/hash update commit in one transaction.
create or replace function public.pup_referral_claim(p_inviter uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare saved puppy_game.pup_account_saves%rowtype;
  ids uuid[]; n integer; amount integer; updated jsonb;
  k text; v jsonb; counter numeric;
begin
 select s.* into saved from puppy_game.pup_account_saves s
 join puppy_accounts.pup_accounts a on a.id=s.account_uuid and a.player_uuid=s.player_uuid
 join puppy_pupeye.pupeye_players p on p.id=a.player_uuid
 where a.id=p_inviter and a.status='active' and p.status='active' for update of s;
 if not found then raise exception 'REFERRAL_SAVE_UNAVAILABLE'; end if;
 select array_agg(invited_id) into ids from
 (select invited_id from puppy_web.referral_rows(p_inviter) where progress='ready' order by joined_at,invited_id limit 20) eligible;
 n:=coalesce(cardinality(ids),0);
 if n=0 then return jsonb_build_object('claimed',0,'treats',0); end if;
 amount:=n*500; updated:=saved.save_data;
 if updated->>'format' is distinct from 'puppy-clicker-cloud-save'
 or jsonb_typeof(updated#>'{stores,puppy_clicker_save,types}') is distinct from 'object'
 or jsonb_typeof(updated#>'{stores,puppy_clicker_save,values}') is distinct from 'object' then
 raise exception 'REFERRAL_SAVE_INVALID'; end if;
 foreach k in array array['treats','lifetime_treats'] loop
  v:=updated#>array['stores','puppy_clicker_save','values',k];
  if jsonb_typeof(v) is distinct from 'number' then raise exception 'REFERRAL_SAVE_INVALID'; end if;
  counter:=(v#>>'{}')::numeric;
  if counter<0 or counter<>trunc(counter) or counter+amount>9007199254740991 then raise exception 'REFERRAL_BALANCE_LIMIT'; end if;
  updated:=jsonb_set(updated,array['stores','puppy_clicker_save','values',k],to_jsonb((counter+amount)::bigint));
  updated:=jsonb_set(updated,array['stores','puppy_clicker_save','types',k],to_jsonb('long'::text));
 end loop;
 updated:=jsonb_set(updated,'{savedAtEpochMs}',to_jsonb(floor(extract(epoch from now())*1000)::bigint));
 insert into puppy_web.pup_referral_rewards(invited_account_uuid,inviter_account_uuid,treats)
 select unnest(ids),p_inviter,500;
 update puppy_game.pup_account_saves set save_data=updated,revision=revision+1,updated_at=now(),
 payload_hash_sha256=encode(extensions.digest(public.pup_exchange_canonical(updated),'sha256'),'hex')
 where player_uuid=saved.player_uuid and account_uuid=p_inviter;
 return jsonb_build_object('claimed',n,'treats',amount,'revision',saved.revision+1);
end $$;
revoke all on function public.pup_referral_status(uuid),public.pup_referral_claim(uuid) from public,anon,authenticated;
grant execute on function public.pup_referral_status(uuid),public.pup_referral_claim(uuid) to service_role;
notify pgrst,'reload schema';
