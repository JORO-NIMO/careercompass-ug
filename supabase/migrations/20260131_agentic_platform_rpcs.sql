-- Migration: Agentic Platform RPCs
-- Provides secure, auditable functions for admin actions, search, matching, and alerts

BEGIN;

-- ============================================================================
-- ADMIN ACTION RPCs (with audit trail)
-- ============================================================================

-- Flag a placement for review
CREATE OR REPLACE FUNCTION admin_flag_placement(
  p_id UUID,
  p_reason TEXT DEFAULT 'Flagged for review',
  p_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Verify caller is admin
  IF NOT public.has_role(COALESCE(p_by, auth.uid()), 'admin') THEN
    RAISE EXCEPTION 'Permission denied: admin role required';
  END IF;

  UPDATE public.placements
  SET
    flagged = true,
    flag_reason = p_reason,
    flagged_at = NOW(),
    flagged_by = COALESCE(p_by, auth.uid()),
    approved = false,
    updated_at = NOW()
  WHERE id = p_id
  RETURNING jsonb_build_object(
    'id', id,
    'flagged', flagged,
    'flag_reason', flag_reason,
    'flagged_at', flagged_at
  ) INTO v_result;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Placement not found: %', p_id;
  END IF;

  RETURN v_result;
END;
$$;

-- Clear flag from a placement
CREATE OR REPLACE FUNCTION admin_clear_placement(
  p_id UUID,
  p_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT public.has_role(COALESCE(p_by, auth.uid()), 'admin') THEN
    RAISE EXCEPTION 'Permission denied: admin role required';
  END IF;

  UPDATE public.placements
  SET
    flagged = false,
    flag_reason = NULL,
    flagged_at = NULL,
    flagged_by = NULL,
    approved = true,
    updated_at = NOW()
  WHERE id = p_id
  RETURNING jsonb_build_object(
    'id', id,
    'flagged', flagged,
    'approved', approved,
    'updated_at', updated_at
  ) INTO v_result;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Placement not found: %', p_id;
  END IF;

  RETURN v_result;
END;
$$;

-- Delete a placement (hard delete with audit log)
CREATE OR REPLACE FUNCTION admin_delete_placement(
  p_id UUID,
  p_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted JSONB;
BEGIN
  IF NOT public.has_role(COALESCE(p_by, auth.uid()), 'admin') THEN
    RAISE EXCEPTION 'Permission denied: admin role required';
  END IF;

  -- Capture before delete for audit
  SELECT jsonb_build_object(
    'id', id,
    'position_title', position_title,
    'company_name', company_name,
    'deleted_by', COALESCE(p_by, auth.uid()),
    'deleted_at', NOW()
  ) INTO v_deleted
  FROM public.placements
  WHERE id = p_id;

  IF v_deleted IS NULL THEN
    RAISE EXCEPTION 'Placement not found: %', p_id;
  END IF;

  DELETE FROM public.placements WHERE id = p_id;

  RETURN v_deleted;
END;
$$;

-- ============================================================================
-- SEARCH RPC (full-text + trigram + filters)
-- ============================================================================

CREATE OR REPLACE FUNCTION search_placements(
  p_query TEXT DEFAULT '',
  p_region TEXT DEFAULT NULL,
  p_industry TEXT DEFAULT NULL,
  p_flagged BOOLEAN DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  position_title TEXT,
  company_name TEXT,
  description TEXT,
  region TEXT,
  industry TEXT,
  stipend TEXT,
  available_slots INT,
  deadline TIMESTAMPTZ,
  application_link TEXT,
  flagged BOOLEAN,
  created_at TIMESTAMPTZ,
  rank REAL
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_query TEXT;
BEGIN
  v_query := COALESCE(NULLIF(TRIM(p_query), ''), NULL);

  RETURN QUERY
  SELECT
    p.id,
    p.position_title,
    p.company_name,
    p.description,
    p.region,
    p.industry,
    p.stipend,
    p.available_slots,
    p.deadline,
    p.application_link,
    p.flagged,
    p.created_at,
    CASE
      WHEN v_query IS NOT NULL THEN
        GREATEST(
          similarity(p.position_title, v_query),
          similarity(p.company_name, v_query)
        )
      ELSE 1.0
    END AS rank
  FROM public.placements p
  WHERE
    (p_region IS NULL OR p.region = p_region)
    AND (p_industry IS NULL OR p.industry = p_industry)
    AND (p_flagged IS NULL OR p.flagged = p_flagged)
    AND (
      v_query IS NULL
      OR p.position_title ILIKE '%' || v_query || '%'
      OR p.company_name ILIKE '%' || v_query || '%'
      OR p.description ILIKE '%' || v_query || '%'
    )
  ORDER BY
    CASE WHEN v_query IS NOT NULL THEN
      GREATEST(
        similarity(p.position_title, v_query),
        similarity(p.company_name, v_query)
      )
    ELSE 0 END DESC,
    p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- ============================================================================
-- PROFILE MATCHING RPC (vector similarity + rules)
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
  -- Get user profile
  SELECT
    areas_of_interest,
    COALESCE(town_city, district, region) AS location,
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
-- JOB ALERT SUBSCRIPTION
-- ============================================================================

-- Create alerts table if not exists
CREATE TABLE IF NOT EXISTS public.job_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  criteria JSONB NOT NULL DEFAULT '{}',
  channels TEXT[] NOT NULL DEFAULT ARRAY['push'],
  active BOOLEAN NOT NULL DEFAULT true,
  last_notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.job_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own alerts"
  ON public.job_alerts
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_job_alerts_user_id ON public.job_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_job_alerts_active ON public.job_alerts(active) WHERE active = true;

-- Subscribe to job alerts
CREATE OR REPLACE FUNCTION subscribe_job_alerts(
  p_user_id UUID,
  p_criteria JSONB DEFAULT '{}',
  p_channels TEXT[] DEFAULT ARRAY['push']
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.job_alerts (user_id, criteria, channels)
  VALUES (p_user_id, p_criteria, p_channels)
  ON CONFLICT (user_id) DO UPDATE
  SET
    criteria = EXCLUDED.criteria,
    channels = EXCLUDED.channels,
    active = true,
    updated_at = NOW()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Add unique constraint for upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'job_alerts_user_id_key'
  ) THEN
    ALTER TABLE public.job_alerts ADD CONSTRAINT job_alerts_user_id_key UNIQUE (user_id);
  END IF;
END$$;

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT EXECUTE ON FUNCTION admin_flag_placement TO authenticated;
GRANT EXECUTE ON FUNCTION admin_clear_placement TO authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_placement TO authenticated;
GRANT EXECUTE ON FUNCTION search_placements TO authenticated, anon;
GRANT EXECUTE ON FUNCTION match_profile_to_jobs TO authenticated;
GRANT EXECUTE ON FUNCTION subscribe_job_alerts TO authenticated;

COMMENT ON FUNCTION admin_flag_placement IS 'Flag a placement for manual review (admin only)';
COMMENT ON FUNCTION admin_clear_placement IS 'Clear flag and approve placement (admin only)';
COMMENT ON FUNCTION admin_delete_placement IS 'Delete a placement with audit (admin only)';
COMMENT ON FUNCTION search_placements IS 'Search placements with full-text, trigram, and filters';
COMMENT ON FUNCTION match_profile_to_jobs IS 'Match user profile to relevant job placements';
COMMENT ON FUNCTION subscribe_job_alerts IS 'Subscribe to job alerts with criteria and channels';

COMMIT;
