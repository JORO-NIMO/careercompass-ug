-- Migration: Newsletter/Email Ingestion
-- Tables and RPCs for email-based job ingestion

BEGIN;

-- ============================================================================
-- EMAIL INGESTION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ingested_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT UNIQUE NOT NULL,
  from_address TEXT NOT NULL,
  to_address TEXT,
  subject TEXT,
  received_at TIMESTAMPTZ NOT NULL,
  raw_content TEXT,
  parsed_jobs JSONB DEFAULT '[]',
  jobs_extracted INT DEFAULT 0,
  jobs_verified INT DEFAULT 0,
  jobs_inserted INT DEFAULT 0,
  processing_status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
  error_message TEXT,
  source_trust_score NUMERIC(3,2) DEFAULT 0.5,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

ALTER TABLE public.ingested_emails ENABLE ROW LEVEL SECURITY;

-- Only admins can view ingested emails
CREATE POLICY "Admins can view ingested emails"
  ON public.ingested_emails
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Service role can manage
CREATE POLICY "Service can manage ingested emails"
  ON public.ingested_emails
  FOR ALL
  TO service_role
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_ingested_emails_status ON public.ingested_emails(processing_status);
CREATE INDEX IF NOT EXISTS idx_ingested_emails_from ON public.ingested_emails(from_address);
CREATE INDEX IF NOT EXISTS idx_ingested_emails_received ON public.ingested_emails(received_at DESC);

-- ============================================================================
-- TRUSTED EMAIL SOURCES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.email_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_pattern TEXT NOT NULL,  -- e.g., '@linkedin.com', 'jobs@company.com'
  source_name TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('newsletter', 'job_board', 'company', 'aggregator')),
  trust_score NUMERIC(3,2) DEFAULT 0.5 CHECK (trust_score >= 0 AND trust_score <= 1),
  parsing_rules JSONB DEFAULT '{}',  -- Custom parsing rules per source
  is_active BOOLEAN DEFAULT true,
  total_emails_processed INT DEFAULT 0,
  total_jobs_extracted INT DEFAULT 0,
  last_email_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.email_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage email sources"
  ON public.email_sources
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_email_sources_pattern ON public.email_sources(email_pattern);
CREATE INDEX IF NOT EXISTS idx_email_sources_active ON public.email_sources(is_active) WHERE is_active = true;

-- Insert default trusted sources
INSERT INTO public.email_sources (email_pattern, source_name, source_type, trust_score, parsing_rules) VALUES
  ('@linkedin.com', 'LinkedIn', 'job_board', 0.9, '{"type": "linkedin"}'),
  ('@indeed.com', 'Indeed', 'job_board', 0.85, '{"type": "indeed"}'),
  ('@glassdoor.com', 'Glassdoor', 'job_board', 0.8, '{"type": "glassdoor"}'),
  ('@brightermonday.co.ug', 'BrighterMonday Uganda', 'job_board', 0.85, '{"type": "brightermonday"}'),
  ('@fuzu.com', 'Fuzu', 'job_board', 0.8, '{"type": "fuzu"}'),
  ('@careerpointke.co.ke', 'CareerPoint', 'job_board', 0.75, '{"type": "generic"}')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- EMAIL INGESTION RPCs
-- ============================================================================

-- Get trust score for an email address
CREATE OR REPLACE FUNCTION get_email_trust_score(
  p_from_address TEXT
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_score NUMERIC := 0.3;  -- Default low trust
  v_source RECORD;
BEGIN
  -- Check for matching source patterns
  FOR v_source IN 
    SELECT trust_score, email_pattern 
    FROM public.email_sources 
    WHERE is_active = true
    ORDER BY LENGTH(email_pattern) DESC  -- More specific patterns first
  LOOP
    IF p_from_address ILIKE '%' || v_source.email_pattern THEN
      v_score := v_source.trust_score;
      EXIT;
    END IF;
  END LOOP;
  
  RETURN v_score;
END;
$$;

-- Record an ingested email
CREATE OR REPLACE FUNCTION record_ingested_email(
  p_message_id TEXT,
  p_from_address TEXT,
  p_to_address TEXT,
  p_subject TEXT,
  p_received_at TIMESTAMPTZ,
  p_raw_content TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_trust_score NUMERIC;
BEGIN
  -- Get trust score
  v_trust_score := get_email_trust_score(p_from_address);
  
  -- Insert or update email record
  INSERT INTO public.ingested_emails (
    message_id,
    from_address,
    to_address,
    subject,
    received_at,
    raw_content,
    source_trust_score,
    metadata
  ) VALUES (
    p_message_id,
    p_from_address,
    p_to_address,
    p_subject,
    p_received_at,
    p_raw_content,
    v_trust_score,
    p_metadata
  )
  ON CONFLICT (message_id) DO UPDATE SET
    processing_status = 'pending',
    error_message = NULL
  RETURNING id INTO v_id;
  
  -- Update source stats
  UPDATE public.email_sources
  SET 
    total_emails_processed = total_emails_processed + 1,
    last_email_at = NOW(),
    updated_at = NOW()
  WHERE p_from_address ILIKE '%' || email_pattern;
  
  RETURN v_id;
END;
$$;

-- Update email processing result
CREATE OR REPLACE FUNCTION update_email_processing(
  p_email_id UUID,
  p_status TEXT,
  p_parsed_jobs JSONB DEFAULT NULL,
  p_jobs_extracted INT DEFAULT 0,
  p_jobs_verified INT DEFAULT 0,
  p_jobs_inserted INT DEFAULT 0,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.ingested_emails
  SET
    processing_status = p_status,
    parsed_jobs = COALESCE(p_parsed_jobs, parsed_jobs),
    jobs_extracted = p_jobs_extracted,
    jobs_verified = p_jobs_verified,
    jobs_inserted = p_jobs_inserted,
    error_message = p_error_message,
    processed_at = NOW()
  WHERE id = p_email_id;
  
  -- Update source job count if jobs were extracted
  IF p_jobs_extracted > 0 THEN
    UPDATE public.email_sources
    SET 
      total_jobs_extracted = total_jobs_extracted + p_jobs_extracted,
      updated_at = NOW()
    FROM public.ingested_emails e
    WHERE e.id = p_email_id
    AND e.from_address ILIKE '%' || email_sources.email_pattern;
  END IF;
END;
$$;

-- Get email ingestion stats for admin
CREATE OR REPLACE FUNCTION get_email_ingestion_stats(
  p_days INT DEFAULT 7
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Permission denied: admin role required';
  END IF;

  SELECT jsonb_build_object(
    'summary', (
      SELECT jsonb_build_object(
        'total_emails', COUNT(*),
        'processed', COUNT(*) FILTER (WHERE processing_status = 'completed'),
        'failed', COUNT(*) FILTER (WHERE processing_status = 'failed'),
        'pending', COUNT(*) FILTER (WHERE processing_status = 'pending'),
        'total_jobs_extracted', SUM(jobs_extracted),
        'total_jobs_inserted', SUM(jobs_inserted),
        'avg_trust_score', ROUND(AVG(source_trust_score)::NUMERIC, 2)
      )
      FROM public.ingested_emails
      WHERE received_at > NOW() - (p_days || ' days')::INTERVAL
    ),
    'by_source', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT
          es.source_name,
          es.trust_score,
          es.total_emails_processed,
          es.total_jobs_extracted,
          es.last_email_at
        FROM public.email_sources es
        WHERE es.is_active = true
        ORDER BY es.total_jobs_extracted DESC
        LIMIT 20
      ) t
    ),
    'recent_emails', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT
          id,
          from_address,
          subject,
          processing_status,
          jobs_extracted,
          jobs_inserted,
          source_trust_score,
          received_at,
          error_message
        FROM public.ingested_emails
        WHERE received_at > NOW() - (p_days || ' days')::INTERVAL
        ORDER BY received_at DESC
        LIMIT 50
      ) t
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

COMMIT;
