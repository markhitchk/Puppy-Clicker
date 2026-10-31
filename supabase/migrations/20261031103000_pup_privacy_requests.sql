-- Puppy Clicker GDPR rights-intake only. No automatic erasure or export.
-- Existing canonical schemas are preserved; no account table is changed.
create schema if not exists puppy_privacy;
revoke all on schema puppy_privacy from public,anon,authenticated;
grant usage on schema puppy_privacy to service_role;
create table if not exists puppy_privacy.requests (
 id uuid primary key default gen_random_uuid(),
 account_uuid uuid references puppy_accounts.pup_accounts(id) on delete set null,
 auth_user_id uuid,
 type text not null check(type in ('access','export','rectify','restrict','object','erase')),
 state text not null default 'received' check(state in ('received','identity_review','awaiting_review','in_progress','ready','completed','denied','cancelled','failed')),
 request_note text not null default '' check(length(request_note)<=500),
 submitted_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 deadline_at timestamptz not null default (now()+interval '1 month'),
 closed_at timestamptz, review_note text,
 constraint puppy_privacy_review_length check(review_note is null or length(review_note)<=2000)
);
create index if not exists puppy_privacy_requests_account_submitted_idx on puppy_privacy.requests(account_uuid,submitted_at desc);
alter table puppy_privacy.requests enable row level security;
revoke all on puppy_privacy.requests from public,anon,authenticated;
grant select,insert,update,delete on puppy_privacy.requests to service_role;
create or replace view public.pup_privacy_requests with (security_invoker=true) as select * from puppy_privacy.requests;
revoke all on public.pup_privacy_requests from public,anon,authenticated;
grant select,insert,update on public.pup_privacy_requests to service_role;
comment on table puppy_privacy.requests is 'Pup Account GDPR request intake, reviewed by staff. Not automatic erasure.';
notify pgrst,'reload schema';
