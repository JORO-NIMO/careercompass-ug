-- Enable pg_cron extension (run once in SQL Editor)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to postgres user
GRANT USAGE ON SCHEMA cron TO postgres;

-- ============================================================================
-- CRON JOB: Job Ingestion (every 6 hours)
-- ============================================================================

-- This calls your Edge Function to ingest jobs
SELECT cron.schedule(
  'ingest-jobs',           -- job name
  '0 */6 * * *',           -- every 6 hours
  $$
  SELECT net.http_post(
    url := 'https://xicdxswrtdassnlurnmp.supabase.co/functions/v1/ingest-jobs',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ============================================================================
-- CRON JOB: Match & Notify (every 4 hours)
-- ============================================================================

SELECT cron.schedule(
  'match-notify',
  '0 */4 * * *',           -- every 4 hours
  $$
  SELECT net.http_post(
    url := 'https://xicdxswrtdassnlurnmp.supabase.co/functions/v1/match-notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ============================================================================
-- CRON JOB: Daily Digest Email (every day at 8 AM UTC)
-- ============================================================================

SELECT cron.schedule(
  'daily-digest',
  '0 8 * * *',             -- 8 AM UTC daily
  $$
  SELECT net.http_post(
    url := 'https://xicdxswrtdassnlurnmp.supabase.co/functions/v1/send-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ============================================================================
-- VIEW SCHEDULED JOBS
-- ============================================================================

-- See all scheduled jobs
SELECT * FROM cron.job;

-- See job execution history
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;

-- ============================================================================
-- MANAGE JOBS
-- ============================================================================

-- To disable a job:
-- SELECT cron.unschedule('ingest-jobs');

-- To update schedule:
-- SELECT cron.alter_job('ingest-jobs', schedule := '0 */3 * * *');
