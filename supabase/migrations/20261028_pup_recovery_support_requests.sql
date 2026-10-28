-- Private manual Pup Account recovery requests (not proof of ownership).
create table if not exists public.pup_recovery_requests (
 id uuid primary key default gen_random_uuid(),
 reference text not null unique check (reference ~ '^PUP-RC-[A-F0-9]{20}$'),
 requested_username text not null check (requested_username ~ '^[A-Za-z0-9_-]{3,20}$'),
 username_key text not null check (username_key = lower(requested_username)),
 contact_email text not null check (char_length(contact_email) between 5 and 254),
 email_key text not null check (email_key = lower(contact_email)),
 issue_type text not null check (issue_type in ('lost_password','lost_discord','lost_both','device_change','other')),
 details text not null check (char_length(details) between 20 and 1000),
 requester_digest text not null check (char_length(requester_digest) = 64),
 status text not null default 'pending' check (status in ('pending','in_review','resolved','rejected')),
 staff_notes text,
 created_at timestamptz not null default now(),
 reviewed_at timestamptz
);
create index if not exists pup_recovery_requests_username_time_idx
 on public.pup_recovery_requests(username_key,created_at desc);
create index if not exists pup_recovery_requests_email_time_idx
 on public.pup_recovery_requests(email_key,created_at desc);
create index if not exists pup_recovery_requests_digest_time_idx
 on public.pup_recovery_requests(requester_digest,created_at desc);
create index if not exists pup_recovery_requests_status_time_idx
 on public.pup_recovery_requests(status,created_at desc);
alter table public.pup_recovery_requests enable row level security;
revoke all on public.pup_recovery_requests from public,anon,authenticated;
comment on table public.pup_recovery_requests is 'Staff-reviewed manual recovery intake. Neither an email nor a ticket proves account ownership; never use this table to grant auth or transfer saves automatically.';
