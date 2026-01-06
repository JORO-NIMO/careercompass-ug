-- Enable required extensions
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Schedule the boost maintenance job
-- Runs every 30 minutes
-- Configured with user-provided project ID and Service Role Key
-- Secret: boost_cron_secret_secure_2025 (Ensure this is set in Edge Function ENV)

select cron.schedule(
  'boost-maintenance',
  '*/30 * * * *',
  $$
    select
      net.http_post(
        url:='https://xicdxswrtdassnlurnmp.supabase.co/functions/v1/boosts_maintenance',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpY2R4c3dydGRhc3NubHVybm1wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjQ2ODYwNCwiZXhwIjoyMDgyMDQ0NjA0fQ.y1sniv142L9j_N0FwJQdQey2jmeHfxeA_7OIk7zX3cU", "x-cron-secret": "boost_cron_secret_secure_2025"}'::jsonb,
        body:='{}'::jsonb
      ) as request_id;
  $$
);
