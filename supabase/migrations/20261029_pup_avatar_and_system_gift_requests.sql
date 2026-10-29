-- 2026-10-29: Puppy Clicker web profile avatars and server-reviewed system gifts.
-- This migration is scoped to Puppy Clicker-owned objects in the shared Supabase project.
alter table public.pup_accounts add column if not exists profile_avatar_path text;
do $$ begin
 if not exists(select 1 from pg_constraint where conname='pup_profile_avatar_path_check' and conrelid='public.pup_accounts'::regclass) then
  alter table public.pup_accounts add constraint pup_profile_avatar_path_check
   check (profile_avatar_path is null or profile_avatar_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/avatar[.](png|jpg|webp)$');
 end if;
end $$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('pup-profile-avatars','pup-profile-avatars',true,2097152,array['image/png','image/jpeg','image/webp'])
 on conflict(id) do nothing;
create table if not exists public.pup_gift_requests(
 id uuid primary key default gen_random_uuid(),
 account_uuid uuid not null references public.pup_accounts(id) on delete cascade,
 player_uuid uuid not null references public.pupeye_players(id) on delete cascade,
 puppy_id text not null references public.pup_exchange_transfer_policy(puppy_id),
 note text not null default '' check(char_length(note)<=400),
 status text not null default 'pending' check(status in ('pending','approved','declined')),
 created_at timestamptz not null default now(),
 reviewed_at timestamptz,
 reviewed_by_player_uuid uuid references public.pupeye_players(id),
 review_note text check(char_length(review_note)<=400),
 gifted_revision bigint,
 constraint pup_gift_review_consistency check(
  (status='pending' and reviewed_at is null and reviewed_by_player_uuid is null and gifted_revision is null)
  or (status='declined' and reviewed_at is not null and reviewed_by_player_uuid is not null and gifted_revision is null)
  or (status='approved' and reviewed_at is not null and reviewed_by_player_uuid is not null and gifted_revision is not null)
 )
);
create unique index if not exists pup_gift_one_pending_per_account on public.pup_gift_requests(account_uuid) where status='pending';
create index if not exists pup_gift_pending_created_idx on public.pup_gift_requests(status,created_at desc);
alter table public.pup_gift_requests enable row level security;
revoke all on public.pup_gift_requests from public,anon,authenticated;
do $$ begin
 if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Puppy profile uploads owned by user') then
  create policy "Puppy profile uploads owned by user" on storage.objects
  for insert to authenticated with check(
   bucket_id='pup-profile-avatars'
   and (storage.foldername(name))[1]=(select auth.uid())::text
   and name ~ '^[0-9a-f-]{36}/avatar[.](png|jpg|webp)$'
  );
 end if;
end $$;

do $$ begin
 if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Puppy profile replace own photos') then
  create policy "Puppy profile replace own photos" on storage.objects for update to authenticated
  using (bucket_id='pup-profile-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text and name ~ '^[0-9a-f-]{36}/avatar[.](png|jpg|webp)$')
  with check (bucket_id='pup-profile-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text and name ~ '^[0-9a-f-]{36}/avatar[.](png|jpg|webp)$');
 end if;
 if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Puppy profile own file read for replace') then
  create policy "Puppy profile own file read for replace" on storage.objects for select to authenticated
  using (bucket_id='pup-profile-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text and name ~ '^[0-9a-f-]{36}/avatar[.](png|jpg|webp)$');
 end if;
end $$;
