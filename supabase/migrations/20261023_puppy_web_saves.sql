-- Applied to Puppy Clicker DB on October 23, 2026. Additive, web-only save isolation.
create table if not exists public.puppy_web_saves (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null default 0 check (revision >= 0),
  save_data jsonb not null default '{}'::jsonb check (jsonb_typeof(save_data)='object'),
  updated_at timestamptz not null default now()
);
alter table public.puppy_web_saves enable row level security;
revoke all on public.puppy_web_saves from anon, authenticated;
grant select, insert, update on public.puppy_web_saves to authenticated;
create policy "read own web save" on public.puppy_web_saves for select to authenticated
  using ((select auth.uid())=auth_user_id);
create policy "insert own web save" on public.puppy_web_saves for insert to authenticated
  with check ((select auth.uid())=auth_user_id);
create policy "update own web save" on public.puppy_web_saves for update to authenticated
  using ((select auth.uid())=auth_user_id)
  with check ((select auth.uid())=auth_user_id);

create or replace function public.puppy_web_save_commit(p_expected_revision bigint,p_save_data jsonb)
returns bigint language plpgsql security invoker set search_path=''
as $$
declare v_revision bigint;
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED' using errcode='28000';end if;
  if p_expected_revision is null or p_expected_revision<0 or p_save_data is null
    or jsonb_typeof(p_save_data) is distinct from 'object'
    or p_save_data->>'format' is distinct from 'puppy-clicker-web-save'
    or p_save_data->>'schemaVersion' is distinct from '1'
    or octet_length(p_save_data::text)>262144 then
    raise exception 'INVALID_WEB_SAVE' using errcode='22023';
  end if;
  insert into public.puppy_web_saves as s(auth_user_id,revision,save_data,updated_at)
  values ((select auth.uid()),1,p_save_data,now())
  on conflict(auth_user_id) do update
  set revision=s.revision+1,save_data=excluded.save_data,updated_at=now()
  where s.revision=p_expected_revision
  returning s.revision into v_revision;
  if v_revision is null then raise exception 'WEB_SAVE_CONFLICT' using errcode='P0001';end if;
  return v_revision;
end;$$;
revoke all on function public.puppy_web_save_commit(bigint,jsonb) from public, anon;
grant execute on function public.puppy_web_save_commit(bigint,jsonb) to authenticated;
comment on table public.puppy_web_saves is
  'React browser saves only: separate from PupEye-protected Android accounts.';
