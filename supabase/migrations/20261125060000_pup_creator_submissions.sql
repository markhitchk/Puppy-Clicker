-- Private creator moderation queue. Access only through server-side identity checks.
create table public.pup_creator_submissions (
 id uuid primary key default gen_random_uuid(),
 account_uuid uuid not null references puppy_accounts.pup_accounts(id) on delete cascade,
 username text not null,
 content_hash text not null check (length(content_hash)=64),
 name text not null check(length(name) between 1 and 80),
 description text not null check(length(description) between 1 and 240),
 generation text not null check(generation in ('v1','v2')),
 project jsonb not null check(octet_length(project::text)<=3800000),
 submitted_day date not null default ((now() at time zone 'UTC')::date),
 created_at timestamptz not null default now(),
 status text not null default 'pending' check(status in ('pending','approved','rejected','revision','archived')),
 delivery text not null default 'pending' check(delivery in ('pending','sending','delivered','failed','unknown','not_required')),
 discord_message_id text,
 delivery_attempted_at timestamptz,
 review_note text check(length(review_note)<=400),
 reviewed_at timestamptz,
 reviewed_by uuid references puppy_accounts.pup_accounts(id) on delete set null,
 unique(account_uuid,content_hash),
 unique(account_uuid,submitted_day)
);
alter table public.pup_creator_submissions enable row level security;
revoke all on public.pup_creator_submissions from public,anon,authenticated;
grant select,insert,update,delete on public.pup_creator_submissions to service_role;
create index pup_creator_review_order on public.pup_creator_submissions(status,created_at desc);
