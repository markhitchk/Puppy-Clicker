-- Puppy Clicker leaderboard: private opt-in records, default off.
create schema if not exists puppy_leaderboard;
create table if not exists puppy_leaderboard.participants (
 account_uuid uuid primary key references puppy_accounts.pup_accounts(id) on delete cascade,
 opted_in boolean not null default false,
 excluded boolean not null default false,
 joined_at timestamptz,
 updated_at timestamptz not null default now()
);
alter table puppy_leaderboard.participants enable row level security;
grant usage on schema puppy_leaderboard to service_role;
grant select, insert, update on puppy_leaderboard.participants to service_role;
create or replace view public.pup_leaderboard_participants with (security_invoker=true) as
 select account_uuid,opted_in,excluded,joined_at,updated_at from puppy_leaderboard.participants;
grant select,insert,update on public.pup_leaderboard_participants to service_role;
