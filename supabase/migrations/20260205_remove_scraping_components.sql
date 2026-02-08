-- Migration: Remove all scraping-related database objects
-- Date: 2026-02-05
-- Reason: Web scraping removed from the system in favor of APIs, RSS feeds, and manual uploads

BEGIN;

-- Drop the linkedin_jobs table and related objects
DROP FUNCTION IF EXISTS public.cleanup_old_linkedin_jobs();
DROP TABLE IF EXISTS public.linkedin_jobs CASCADE;

-- Remove any scheduled cron jobs related to scraping
-- Note: Run these manually in SQL Editor if pg_cron is enabled
-- SELECT cron.unschedule('ingest-jobs') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ingest-jobs');

COMMIT;

-- DOCUMENTATION:
-- The following components have been removed from the system:
-- 1. scripts/linkedin_scraper/ - LinkedIn job scraper
-- 2. scripts/placement_bot.py - Google search scraper
-- 3. .github/workflows/scraper.yml - GitHub Actions workflow for scraping
-- 4. linkedin_jobs table - Staging table for scraped jobs
-- 5. cleanup_old_linkedin_jobs() function - Cleanup function for scraped data
--
-- Alternative data sources now in use:
-- - supabase/functions/ingest-jobs/ - Uses free job APIs (arbeitnow, etc.)
-- - RSS feeds from trusted sources (opportunitiesforyouth.org, chevening.org, etc.)
-- - Manual uploads via AdminPlacementUpload component
-- - Email parsing via parse-email edge function
