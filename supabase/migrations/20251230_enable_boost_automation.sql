-- Enable required extensions
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Schedule the boost maintenance job
-- Runs every 30 minutes
-- IMPORTANT: The Authorization header below MUST be replaced with an actual service role JWT.
-- Do NOT commit real secrets to the repository.
-- Configure the cron job via the Supabase dashboard or set it manually after deployment.

-- Example (to be run manually in SQL editor with actual secret):
-- select cron.schedule(
--   'boost-maintenance',
--   '*/30 * * * *',
--   $$
--     select
--       net.http_post(
--         url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/boosts_maintenance',
--         headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY", "x-cron-secret": "YOUR_CRON_SECRET"}'::jsonb,
--         body:='{}'::jsonb
--       ) as request_id;
--   $$
-- );
