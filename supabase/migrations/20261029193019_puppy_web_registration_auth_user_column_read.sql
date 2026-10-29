-- Fix Puppy Clicker web registration when its invoker-role RPC validates
-- the newly created Supabase Auth user in auth.users.
-- Keep access least-privilege: only the server's service_role receives
-- SELECT on the three fields required by register_pup_web_account and
-- register_pup_web_discord_account; neither anon nor authenticated can read them.
-- This is idempotent, affects no account/save rows, and preserves the RPC's
-- identity ownership and app_metadata validation.
GRANT SELECT (id, email, raw_app_meta_data) ON TABLE auth.users TO service_role;
