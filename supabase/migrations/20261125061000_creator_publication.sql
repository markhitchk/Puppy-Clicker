-- Publish only sanitized developer-approved projects, atomically with the authoritative rarity catalog.
create table puppy_rarity.creator_art(
 puppy_id text primary key references puppy_rarity.catalog(puppy_id),
 submission_id uuid unique not null,
 name text not null check(length(name) between 1 and 80),
 description text not null check(length(description) between 1 and 240),
 generation text not null check(generation in ('v1','v2')),
 artwork text not null check(length(artwork)<=400000 and artwork like 'data:image/png;base64,%'),
 creator_credit text,
 published_at timestamptz not null default now(),
 reward_notification_id uuid
);
alter table puppy_rarity.creator_art enable row level security;
revoke all on puppy_rarity.creator_art from public,anon,authenticated,service_role;
alter table public.pup_creator_submissions add column published_puppy_id text references puppy_rarity.creator_art(puppy_id);
create function public.pup_creator_publish(p_actor uuid,p_submission uuid,p_rarity text,p_reward boolean,p_credit boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare cfg puppy_rarity.config%rowtype; s public.pup_creator_submissions%rowtype; pid text; target uuid; actor_player uuid; gift jsonb; existing puppy_rarity.creator_art%rowtype;
begin
 select * into strict cfg from puppy_rarity.config for update;
 if cfg.owner_id is null or p_actor is distinct from cfg.owner_id then raise exception 'OWNER_REQUIRED'; end if;
 select a.player_uuid into actor_player from puppy_accounts.pup_accounts a join puppy_pupeye.pupeye_players p on p.id=a.player_uuid where a.id=p_actor and a.status='active' and p.status='active' and p.guild_role='DEVELOPER';
 if not found then raise exception 'OWNER_REQUIRED'; end if;
 if p_rarity is null or p_rarity not in ('common','uncommon','rare','epic','legendary') or p_reward is null or p_credit is null then raise exception 'INVALID_CREATOR_PUBLICATION'; end if;
 select * into s from public.pup_creator_submissions where id=p_submission for update;
 if not found then raise exception 'SUBMISSION_NOT_FOUND'; end if;
 if s.published_puppy_id is not null then
  select * into strict existing from puppy_rarity.creator_art where puppy_id=s.published_puppy_id;
  return jsonb_build_object('puppyId',existing.puppy_id,'notificationId',existing.reward_notification_id,'duplicate',true);
 end if;
 if s.status<>'approved' then raise exception 'CREATOR_NOT_APPROVED'; end if;
 pid:=s.generation||'_creator_'||left(replace(s.id::text,'-',''),24);
 if p_reward then
  select a.player_uuid into target from puppy_accounts.pup_accounts a join puppy_pupeye.pupeye_players p on p.id=a.player_uuid where a.id=s.account_uuid and a.status='active' and p.status='active' and not exists(select 1 from public.pupeye_resolve_global_ban(a.player_uuid,a.discord_user_id,null,null,null));
  if not found then raise exception 'TARGET_ACCOUNT_NOT_ACTIVE'; end if;
 end if;
 insert into puppy_exchange.pup_exchange_transfer_policy(puppy_id,giftable,tradeable,bound,source_copy) values(pid,true,false,false,false);
 insert into puppy_rarity.catalog(puppy_id,rarity,acquisition,published) values(pid,p_rarity,'community',true);
 update puppy_rarity.config set version=version+1;
 insert into puppy_rarity.creator_art(puppy_id,submission_id,name,description,generation,artwork,creator_credit)
 values(pid,s.id,s.name,s.description,s.generation,s.project->>'artwork',case when p_credit then s.username else null end);
 if p_reward then
  gift:=public.pup_rarity_gift(p_actor,target,pid,s.id,'Published creator puppy',null);
  update puppy_rarity.creator_art set reward_notification_id=(gift->>'notificationId')::uuid where puppy_id=pid;
 end if;
 update public.pup_creator_submissions set published_puppy_id=pid where id=s.id;
 insert into puppy_admin.pup_admin_actions(actor_player_uuid,target_player_uuid,action_code,detail)
 values(actor_player,actor_player,'WEB_CREATOR_PUPPY_PUBLISHED',jsonb_build_object('submissionId',s.id,'puppyId',pid,'rarity',p_rarity,'rewardQueued',p_reward));
 return jsonb_build_object('puppyId',pid,'notificationId',gift->>'notificationId','duplicate',false);
end $$;
create function public.pup_creator_roster() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',a.puppy_id,'name',a.name,'description',a.description,'generation',a.generation,'creatorCredit',a.creator_credit) order by a.published_at,a.puppy_id),'[]'::jsonb)
 from puppy_rarity.creator_art a join puppy_rarity.catalog c using(puppy_id) where c.published
$$;
create function public.pup_creator_art(p_id text) returns text language sql stable security definer set search_path='' as $$
 select a.artwork from puppy_rarity.creator_art a join puppy_rarity.catalog c using(puppy_id) where c.published and a.puppy_id=p_id
$$;
revoke all on function public.pup_creator_publish(uuid,uuid,text,boolean,boolean),public.pup_creator_roster(),public.pup_creator_art(text) from public,anon,authenticated;
grant execute on function public.pup_creator_publish(uuid,uuid,text,boolean,boolean),public.pup_creator_art(text) to service_role;
grant execute on function public.pup_creator_roster() to anon,authenticated,service_role;
notify pgrst,'reload schema';
