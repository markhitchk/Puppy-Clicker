-- Signed native clients predate the web inbox. Keep their existing explicit
-- gift-confirmation workflow functional; the web transport cannot call this RPC.
create function public.pup_exchange_complete_native(p_offer uuid,p_actor uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; o puppy_exchange.pup_exchange_offers%rowtype;
begin
 select * into o from puppy_exchange.pup_exchange_offers where id=p_offer;
 if not found or (o.kind='gift' and o.recipient<>p_actor) then raise exception 'EXCHANGE_NOT_AUTHORIZED'; end if;
 result:=puppy_rarity.pup_exchange_confirm_from_inbox(p_offer,p_actor);
 if o.kind='gift' then
  update puppy_web.pup_reward_inbox set claimed_at=coalesce(claimed_at,now()),read_at=coalesce(read_at,now()),claimed_label=coalesce(claimed_label,label)
   where account_uuid=p_actor and source='player' and source_key=p_offer::text;
 end if;
 return result;
end $$;
revoke all on function public.pup_exchange_complete_native(uuid,uuid) from public,anon,authenticated;
grant execute on function public.pup_exchange_complete_native(uuid,uuid) to service_role;
notify pgrst,'reload schema';
