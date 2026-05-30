-- Migration: Fix profile matching RPC and add missing tables
-- Run this in Supabase SQL Editor to fix issues

BEGIN;

-- ============================================================================
-- FIX: match_profile_to_jobs RPC 
-- The profiles table has 'location' not 'town_city/district/region'
-- ============================================================================

CREATE OR REPLACE FUNCTION match_profile_to_jobs(
  p_user_id UUID,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  placement_id UUID,
  position_title TEXT,
  company_name TEXT,
  region TEXT,
  industry TEXT,
  match_score REAL,
  match_reasons TEXT[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_interests TEXT[];
  v_location TEXT;
  v_embedding VECTOR(1536);
BEGIN
  -- Get user profile (FIXED: use 'location' column that actually exists)
  SELECT
    areas_of_interest,
    location,
    embedding
  INTO v_interests, v_location, v_embedding
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_interests IS NULL AND v_embedding IS NULL THEN
    -- Fallback: return latest approved placements
    RETURN QUERY
    SELECT
      p.id,
      p.position_title,
      p.company_name,
      p.region,
      p.industry,
      0.5::REAL AS match_score,
      ARRAY['New opportunity']::TEXT[] AS match_reasons
    FROM public.placements p
    WHERE p.approved = true AND p.flagged = false
    ORDER BY p.created_at DESC
    LIMIT p_limit;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.position_title,
    p.company_name,
    p.region,
    p.industry,
    (
      -- Interest match (0.4 weight)
      CASE WHEN p.industry = ANY(v_interests) THEN 0.4 ELSE 0.0 END
      -- Location match (0.3 weight)
      + CASE WHEN p.region ILIKE '%' || COALESCE(v_location, '') || '%' THEN 0.3 ELSE 0.0 END
      -- Recency bonus (0.2 weight)
      + CASE WHEN p.created_at > NOW() - INTERVAL '7 days' THEN 0.2 ELSE 0.1 END
      -- Base score
      + 0.1
    )::REAL AS match_score,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN p.industry = ANY(v_interests) THEN 'Matches your interests' END,
      CASE WHEN p.region ILIKE '%' || COALESCE(v_location, '') || '%' THEN 'In your area' END,
      CASE WHEN p.created_at > NOW() - INTERVAL '7 days' THEN 'Posted recently' END
    ], NULL) AS match_reasons
  FROM public.placements p
  WHERE p.approved = true AND p.flagged = false
  ORDER BY match_score DESC, p.created_at DESC
  LIMIT p_limit;
END;
$$;

-- ============================================================================
-- ADD: workflow_logs table (needed for job ingestion deduplication)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.workflow_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'skipped')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  records_processed INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookup of recent runs
CREATE INDEX IF NOT EXISTS idx_workflow_logs_name_started 
  ON public.workflow_logs(workflow_name, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_workflow_logs_status 
  ON public.workflow_logs(status) WHERE status = 'started';

-- RLS: Only service role can access
ALTER TABLE public.workflow_logs ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (no RLS policy = service role only)

-- ============================================================================
-- ADD: notification_delivery_logs table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notification_delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  placement_id UUID REFERENCES public.placements(id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('push', 'email', 'sms')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'clicked')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_user 
  ON public.notification_delivery_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_logs_placement 
  ON public.notification_delivery_logs(placement_id);

CREATE INDEX IF NOT EXISTS idx_notification_logs_status 
  ON public.notification_delivery_logs(status, channel);

ALTER TABLE public.notification_delivery_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification logs"
  ON public.notification_delivery_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- ADD: ingested_emails table (for newsletter job extraction)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ingested_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT UNIQUE,
  from_address TEXT NOT NULL,
  to_address TEXT,
  subject TEXT,
  received_at TIMESTAMPTZ,
  raw_body TEXT,
  extracted_jobs JSONB DEFAULT '[]',
  jobs_created INTEGER DEFAULT 0,
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processed', 'failed', 'no_jobs')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ingested_emails_status 
  ON public.ingested_emails(processing_status);

CREATE INDEX IF NOT EXISTS idx_ingested_emails_from 
  ON public.ingested_emails(from_address);

ALTER TABLE public.ingested_emails ENABLE ROW LEVEL SECURITY;
-- No public access - service role only

-- ============================================================================
-- ADD: email_sources table (trusted newsletter sources)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.email_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_pattern TEXT NOT NULL,
  source_name TEXT NOT NULL,
  trust_score REAL DEFAULT 0.7,
  is_active BOOLEAN DEFAULT true,
  jobs_extracted INTEGER DEFAULT 0,
  last_email_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_sources_pattern 
  ON public.email_sources(email_pattern);

ALTER TABLE public.email_sources ENABLE ROW LEVEL SECURITY;
-- No public access - service role only

-- Insert some known job newsletter sources
INSERT INTO public.email_sources (email_pattern, source_name, trust_score) VALUES
  ('%@brightermonday.%', 'BrighterMonday', 0.9),
  ('%@linkedin.com', 'LinkedIn', 0.85),
  ('%@indeed.com', 'Indeed', 0.85),
  ('%@glassdoor.com', 'Glassdoor', 0.8),
  ('%@jobwebug.com', 'JobWeb Uganda', 0.85),
  ('%@fuzu.com', 'Fuzu', 0.85),
  ('%@summitrecruitment.%', 'Summit Recruitment', 0.8)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- ADD: Helper functions for analytics
-- ============================================================================

-- Get workflow statistics
CREATE OR REPLACE FUNCTION get_workflow_stats(
  p_workflow_name TEXT DEFAULT NULL,
  p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  workflow_name TEXT,
  total_runs BIGINT,
  successful_runs BIGINT,
  failed_runs BIGINT,
  total_records_processed BIGINT,
  avg_duration_ms NUMERIC,
  last_run_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    w.workflow_name,
    COUNT(*) as total_runs,
    COUNT(*) FILTER (WHERE status = 'completed') as successful_runs,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_runs,
    SUM(records_processed) as total_records_processed,
    AVG(duration_ms) as avg_duration_ms,
    MAX(started_at) as last_run_at
  FROM public.workflow_logs w
  WHERE 
    (p_workflow_name IS NULL OR w.workflow_name = p_workflow_name)
    AND w.started_at > NOW() - (p_days || ' days')::INTERVAL
  GROUP BY w.workflow_name
  ORDER BY last_run_at DESC;
$$;

-- Get notification delivery statistics
CREATE OR REPLACE FUNCTION get_notification_stats(
  p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  channel TEXT,
  total_sent BIGINT,
  delivered BIGINT,
  clicked BIGINT,
  failed BIGINT,
  delivery_rate NUMERIC,
  click_rate NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    n.channel,
    COUNT(*) as total_sent,
    COUNT(*) FILTER (WHERE status IN ('delivered', 'clicked')) as delivered,
    COUNT(*) FILTER (WHERE status = 'clicked') as clicked,
    COUNT(*) FILTER (WHERE status = 'failed') as failed,
    ROUND(COUNT(*) FILTER (WHERE status IN ('delivered', 'clicked'))::NUMERIC / NULLIF(COUNT(*), 0) * 100, 1) as delivery_rate,
    ROUND(COUNT(*) FILTER (WHERE status = 'clicked')::NUMERIC / NULLIF(COUNT(*) FILTER (WHERE status IN ('delivered', 'clicked')), 0) * 100, 1) as click_rate
  FROM public.notification_delivery_logs n
  WHERE n.created_at > NOW() - (p_days || ' days')::INTERVAL
  GROUP BY n.channel
  ORDER BY total_sent DESC;
$$;

COMMIT;

-- Success message
SELECT 'Migration completed successfully! The following were fixed/created:
  1. match_profile_to_jobs RPC - Fixed column reference
  2. workflow_logs table - Created for job ingestion tracking
  3. notification_delivery_logs table - Created for notification analytics
  4. ingested_emails table - Created for newsletter processing
  5. email_sources table - Created with trusted sources
  6. Analytics helper functions - Created' as status;
