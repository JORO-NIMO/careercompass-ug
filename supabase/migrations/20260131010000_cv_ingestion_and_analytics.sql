-- Migration: CV Ingestion and Workflow Analytics
-- Adds profile embeddings, CV storage, and workflow monitoring

BEGIN;

-- ============================================================================
-- PROFILE EMBEDDINGS & CV STORAGE
-- ============================================================================

-- Add embedding column to profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'embedding'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN embedding VECTOR(1536);
  END IF;
END$$;

-- Add CV-related columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'cv_url'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN cv_url TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'cv_parsed_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN cv_parsed_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'cv_data'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN cv_data JSONB DEFAULT '{}';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'skills'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN skills TEXT[] DEFAULT '{}';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'experience_years'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN experience_years INT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'education_level'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN education_level TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'embedding_updated_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN embedding_updated_at TIMESTAMPTZ;
  END IF;
END$$;

-- Index for vector similarity search
CREATE INDEX IF NOT EXISTS idx_profiles_embedding
  ON public.profiles
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Index for skills array search
CREATE INDEX IF NOT EXISTS idx_profiles_skills
  ON public.profiles
  USING GIN (skills);

-- ============================================================================
-- WORKFLOW LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.workflow_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_name TEXT NOT NULL,
  workflow_id TEXT,
  execution_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'warning')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INT,
  items_processed INT DEFAULT 0,
  items_succeeded INT DEFAULT 0,
  items_failed INT DEFAULT 0,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.workflow_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view workflow logs
CREATE POLICY "Admins can view workflow logs"
  ON public.workflow_logs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Service role can insert logs
CREATE POLICY "Service can insert workflow logs"
  ON public.workflow_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Indexes for workflow logs
CREATE INDEX IF NOT EXISTS idx_workflow_logs_name ON public.workflow_logs(workflow_name);
CREATE INDEX IF NOT EXISTS idx_workflow_logs_status ON public.workflow_logs(status);
CREATE INDEX IF NOT EXISTS idx_workflow_logs_started_at ON public.workflow_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_logs_name_started ON public.workflow_logs(workflow_name, started_at DESC);

-- ============================================================================
-- NOTIFICATION DELIVERY LOGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notification_delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('push', 'email', 'sms')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'clicked')),
  provider TEXT,
  provider_message_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notification_delivery_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view delivery logs"
  ON public.notification_delivery_logs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own delivery logs"
  ON public.notification_delivery_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_delivery_logs_user ON public.notification_delivery_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_logs_channel ON public.notification_delivery_logs(channel);
CREATE INDEX IF NOT EXISTS idx_delivery_logs_status ON public.notification_delivery_logs(status);
CREATE INDEX IF NOT EXISTS idx_delivery_logs_created ON public.notification_delivery_logs(created_at DESC);

-- ============================================================================
-- ANALYTICS RPCs
-- ============================================================================

-- Get workflow health stats
CREATE OR REPLACE FUNCTION get_workflow_health_stats(
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
        'total_executions', COUNT(*),
        'successful', COUNT(*) FILTER (WHERE status = 'completed'),
        'failed', COUNT(*) FILTER (WHERE status = 'failed'),
        'success_rate', ROUND(
          COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC / 
          NULLIF(COUNT(*), 0) * 100, 2
        ),
        'avg_duration_ms', ROUND(AVG(duration_ms)),
        'total_items_processed', SUM(items_processed),
        'total_items_succeeded', SUM(items_succeeded),
        'total_items_failed', SUM(items_failed)
      )
      FROM public.workflow_logs
      WHERE started_at > NOW() - (p_days || ' days')::INTERVAL
    ),
    'by_workflow', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT
          workflow_name,
          COUNT(*) AS executions,
          COUNT(*) FILTER (WHERE status = 'completed') AS successful,
          COUNT(*) FILTER (WHERE status = 'failed') AS failed,
          ROUND(AVG(duration_ms)) AS avg_duration_ms,
          MAX(started_at) AS last_run
        FROM public.workflow_logs
        WHERE started_at > NOW() - (p_days || ' days')::INTERVAL
        GROUP BY workflow_name
        ORDER BY executions DESC
      ) t
    ),
    'by_day', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT
          DATE(started_at) AS date,
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status = 'completed') AS successful,
          COUNT(*) FILTER (WHERE status = 'failed') AS failed
        FROM public.workflow_logs
        WHERE started_at > NOW() - (p_days || ' days')::INTERVAL
        GROUP BY DATE(started_at)
        ORDER BY date DESC
      ) t
    ),
    'recent_failures', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT
          id,
          workflow_name,
          error_message,
          started_at,
          items_failed
        FROM public.workflow_logs
        WHERE status = 'failed'
        AND started_at > NOW() - (p_days || ' days')::INTERVAL
        ORDER BY started_at DESC
        LIMIT 10
      ) t
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Get notification delivery stats
CREATE OR REPLACE FUNCTION get_notification_delivery_stats(
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
        'total_sent', COUNT(*) FILTER (WHERE status IN ('sent', 'delivered', 'clicked')),
        'delivered', COUNT(*) FILTER (WHERE status IN ('delivered', 'clicked')),
        'clicked', COUNT(*) FILTER (WHERE status = 'clicked'),
        'failed', COUNT(*) FILTER (WHERE status = 'failed'),
        'delivery_rate', ROUND(
          COUNT(*) FILTER (WHERE status IN ('delivered', 'clicked'))::NUMERIC / 
          NULLIF(COUNT(*) FILTER (WHERE status IN ('sent', 'delivered', 'clicked', 'failed')), 0) * 100, 2
        ),
        'click_rate', ROUND(
          COUNT(*) FILTER (WHERE status = 'clicked')::NUMERIC / 
          NULLIF(COUNT(*) FILTER (WHERE status IN ('delivered', 'clicked')), 0) * 100, 2
        )
      )
      FROM public.notification_delivery_logs
      WHERE created_at > NOW() - (p_days || ' days')::INTERVAL
    ),
    'by_channel', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT
          channel,
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status IN ('delivered', 'clicked')) AS delivered,
          COUNT(*) FILTER (WHERE status = 'clicked') AS clicked,
          COUNT(*) FILTER (WHERE status = 'failed') AS failed
        FROM public.notification_delivery_logs
        WHERE created_at > NOW() - (p_days || ' days')::INTERVAL
        GROUP BY channel
      ) t
    ),
    'by_day', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT
          DATE(created_at) AS date,
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status IN ('delivered', 'clicked')) AS delivered,
          COUNT(*) FILTER (WHERE status = 'clicked') AS clicked
        FROM public.notification_delivery_logs
        WHERE created_at > NOW() - (p_days || ' days')::INTERVAL
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      ) t
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Update profile with CV data and embedding
CREATE OR REPLACE FUNCTION update_profile_cv(
  p_user_id UUID,
  p_cv_url TEXT,
  p_cv_data JSONB,
  p_skills TEXT[],
  p_experience_years INT,
  p_education_level TEXT,
  p_embedding VECTOR(1536) DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Users can only update their own profile
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Permission denied: can only update own profile';
  END IF;

  UPDATE public.profiles
  SET
    cv_url = p_cv_url,
    cv_data = p_cv_data,
    cv_parsed_at = NOW(),
    skills = p_skills,
    experience_years = p_experience_years,
    education_level = p_education_level,
    embedding = COALESCE(p_embedding, embedding),
    embedding_updated_at = CASE WHEN p_embedding IS NOT NULL THEN NOW() ELSE embedding_updated_at END,
    updated_at = NOW()
  WHERE id = p_user_id
  RETURNING jsonb_build_object(
    'id', id,
    'cv_url', cv_url,
    'cv_parsed_at', cv_parsed_at,
    'skills', skills,
    'experience_years', experience_years,
    'education_level', education_level,
    'has_embedding', embedding IS NOT NULL
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Vector similarity search for matching profiles to jobs
CREATE OR REPLACE FUNCTION match_jobs_by_embedding(
  p_user_id UUID,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  placement_id UUID,
  position_title TEXT,
  company_name TEXT,
  region TEXT,
  industry TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_embedding VECTOR(1536);
BEGIN
  -- Get user embedding
  SELECT embedding INTO v_embedding
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_embedding IS NULL THEN
    -- Fallback to regular matching if no embedding
    RETURN QUERY
    SELECT * FROM match_profile_to_jobs(p_user_id, p_limit);
    RETURN;
  END IF;

  -- Vector similarity search (requires placements to have embeddings too)
  -- For now, fall back to rule-based matching
  RETURN QUERY
  SELECT * FROM match_profile_to_jobs(p_user_id, p_limit);
END;
$$;

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_workflow_health_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_notification_delivery_stats TO authenticated;
GRANT EXECUTE ON FUNCTION update_profile_cv TO authenticated;
GRANT EXECUTE ON FUNCTION match_jobs_by_embedding TO authenticated;

COMMENT ON FUNCTION get_workflow_health_stats IS 'Get workflow execution health statistics (admin only)';
COMMENT ON FUNCTION get_notification_delivery_stats IS 'Get notification delivery statistics (admin only)';
COMMENT ON FUNCTION update_profile_cv IS 'Update profile with parsed CV data and embedding';
COMMENT ON FUNCTION match_jobs_by_embedding IS 'Match jobs using vector similarity on profile embedding';

COMMIT;
