-- This exact Puppy Clicker-only cron schedule is installed on the live database.
-- Requires pg_cron and the moderated social migration.
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule(
 'puppy-social-hourly-cleanup',
 '0 * * * *',
 'select public.pup_social_cleanup()'
);
-- Verify: select jobname,schedule,active from cron.job where jobname='puppy-social-hourly-cleanup';
