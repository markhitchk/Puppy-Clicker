-- Keep the installed exchange contract, including recipient acceptance, friendship,
-- block checks and audited save hashes. Only the wrapper is callable via the API.
alter function public.pup_exchange_complete(uuid,uuid) set schema puppy_rarity;
revoke all on function puppy_rarity.pup_exchange_complete(uuid,uuid) from public,anon,authenticated,service_role;

create function public.pup_exchange_complete(p_offer uuid,p_actor uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare offer puppy_exchange.pup_exchange_offers%rowtype; cfg puppy_rarity.config%rowtype;
 recipient_player uuid; entry puppy_rarity.catalog%rowtype; result jsonb; restricted boolean;
begin
 select * into strict cfg from puppy_rarity.config for share;
 select * into offer from puppy_exchange.pup_exchange_offers where id=p_offer for update;
 if not found then raise exception 'EXCHANGE_OFFER_NOT_PENDING'; end if;
 if offer.kind='gift' then
  if cardinality(offer.offered) is distinct from 1 then raise exception 'EXCHANGE_INVALID_CONTENTS'; end if;
  select * into entry from puppy_rarity.catalog where puppy_id=offer.offered[1];
  if not found or not entry.published then raise exception 'PUPPY_RESTRICTED'; end if;
  select entry.rarity='unobtainable' or p.bound or not p.giftable or p.source_copy into restricted
   from puppy_exchange.pup_exchange_transfer_policy p where p.puppy_id=offer.offered[1];
  if restricted then
   if cfg.owner_id is null or offer.sender is distinct from cfg.owner_id or not exists (
    select 1 from puppy_exchange.pup_exchange_privileged_gifters where account_uuid=offer.sender and enabled
   ) then raise exception 'OWNER_REQUIRED'; end if;
   select player_uuid into strict recipient_player from puppy_accounts.pup_accounts where id=offer.recipient;
   perform set_config('puppy_rarity.grant',recipient_player::text||'/'||offer.offered[1],true);
  end if;
 end if;
 result:=puppy_rarity.pup_exchange_complete(p_offer,p_actor);
 if restricted then
  perform set_config('puppy_rarity.grant','',true);
  insert into puppy_rarity.history(actor,operation_id,action,puppy_id,target,reason,payload,after_value,catalog_version)
   values(offer.sender,p_offer,'gift',offer.offered[1],recipient_player,'Accepted exchange gift',
    jsonb_build_object('offer',p_offer),result,cfg.version);
 end if;
 return result;
end $$;
revoke all on function public.pup_exchange_complete(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.pup_exchange_complete(uuid,uuid) to service_role;
