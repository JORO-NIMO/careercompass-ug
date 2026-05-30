-- Refine profile matching to include database feeds (listings) and strengthen AI fallback path

BEGIN;

CREATE OR REPLACE FUNCTION public.match_profile_to_jobs(
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
BEGIN
  SELECT
    areas_of_interest,
    location
  INTO v_interests, v_location
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_interests IS NULL THEN
    v_interests := ARRAY[]::TEXT[];
  END IF;

  IF COALESCE(array_length(v_interests, 1), 0) = 0 AND COALESCE(v_location, '') = '' THEN
    RETURN QUERY
    WITH recent_candidates AS (
      SELECT
        p.id AS id,
        p.position_title,
        p.company_name,
        p.region,
        p.industry,
        p.created_at,
        'placement'::TEXT AS source
      FROM public.placements p
      WHERE p.approved = true AND p.flagged = false

      UNION ALL

      SELECT
        l.id AS id,
        l.title AS position_title,
        COALESCE(c.name, 'External Source') AS company_name,
        l.region,
        COALESCE(l.opportunity_type, 'General') AS industry,
        l.created_at,
        'listing'::TEXT AS source
      FROM public.listings l
      LEFT JOIN public.companies c ON c.id = l.company_id
    )
    SELECT
      rc.id,
      rc.position_title,
      rc.company_name,
      rc.region,
      rc.industry,
      0.5::REAL AS match_score,
      ARRAY['Recent opportunity from database feed', 'Fallback (profile lacks preferences)']::TEXT[] AS match_reasons
    FROM recent_candidates rc
    ORDER BY rc.created_at DESC
    LIMIT p_limit;

    RETURN;
  END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT
      p.id AS id,
      p.position_title,
      p.company_name,
      p.region,
      p.industry,
      p.created_at,
      p.description,
      'placement'::TEXT AS source
    FROM public.placements p
    WHERE p.approved = true AND p.flagged = false

    UNION ALL

    SELECT
      l.id AS id,
      l.title AS position_title,
      COALESCE(c.name, 'External Source') AS company_name,
      l.region,
      COALESCE(l.opportunity_type, 'General') AS industry,
      l.created_at,
      l.description,
      'listing'::TEXT AS source
    FROM public.listings l
    LEFT JOIN public.companies c ON c.id = l.company_id
  ),
  scored AS (
    SELECT
      c.id,
      c.position_title,
      c.company_name,
      c.region,
      c.industry,
      (
        CASE
          WHEN COALESCE(array_length(v_interests, 1), 0) > 0
            AND (
              c.industry = ANY(v_interests)
              OR EXISTS (
                SELECT 1
                FROM unnest(v_interests) i
                WHERE c.position_title ILIKE '%' || i || '%'
                   OR COALESCE(c.description, '') ILIKE '%' || i || '%'
              )
            )
          THEN 0.45 ELSE 0.0
        END
        + CASE
            WHEN COALESCE(v_location, '') <> ''
              AND COALESCE(c.region, '') ILIKE '%' || v_location || '%'
            THEN 0.30 ELSE 0.0
          END
        + CASE
            WHEN c.created_at > NOW() - INTERVAL '7 days' THEN 0.20
            WHEN c.created_at > NOW() - INTERVAL '30 days' THEN 0.10
            ELSE 0.05
          END
        + CASE WHEN c.source = 'listing' THEN 0.05 ELSE 0.0 END
      )::REAL AS score,
      ARRAY_REMOVE(ARRAY[
        CASE
          WHEN COALESCE(array_length(v_interests, 1), 0) > 0
            AND (
              c.industry = ANY(v_interests)
              OR EXISTS (
                SELECT 1
                FROM unnest(v_interests) i
                WHERE c.position_title ILIKE '%' || i || '%'
                   OR COALESCE(c.description, '') ILIKE '%' || i || '%'
              )
            )
          THEN 'Matches your interests'
        END,
        CASE
          WHEN COALESCE(v_location, '') <> ''
            AND COALESCE(c.region, '') ILIKE '%' || v_location || '%'
          THEN 'In your area'
        END,
        CASE WHEN c.created_at > NOW() - INTERVAL '7 days' THEN 'Posted recently' END,
        CASE WHEN c.source = 'listing' THEN 'Matched from ingested feed' END
      ], NULL) AS reasons
    FROM candidates c
  )
  SELECT
    s.id,
    s.position_title,
    s.company_name,
    s.region,
    s.industry,
    s.score AS match_score,
    CASE WHEN COALESCE(array_length(s.reasons, 1), 0) = 0
      THEN ARRAY['General relevance']::TEXT[]
      ELSE s.reasons
    END AS match_reasons
  FROM scored s
  ORDER BY s.score DESC, s.id
  LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.match_jobs_by_embedding(
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
  v_has_listings_embedding BOOLEAN;
BEGIN
  SELECT embedding INTO v_embedding
  FROM public.profiles
  WHERE id = p_user_id;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'listings'
      AND column_name = 'embedding'
  ) INTO v_has_listings_embedding;

  IF v_embedding IS NULL OR NOT v_has_listings_embedding THEN
    RETURN QUERY
    SELECT
      m.placement_id,
      m.position_title,
      m.company_name,
      m.region,
      m.industry,
      m.match_score::FLOAT AS similarity
    FROM public.match_profile_to_jobs(p_user_id, p_limit) m;
    RETURN;
  END IF;

  RETURN QUERY
  WITH semantic AS (
    SELECT
      l.id,
      l.title AS position_title,
      COALESCE(c.name, 'External Source') AS company_name,
      l.region,
      COALESCE(l.opportunity_type, 'General') AS industry,
      (1 - (l.embedding <=> v_embedding))::FLOAT AS similarity,
      l.created_at
    FROM public.listings l
    LEFT JOIN public.companies c ON c.id = l.company_id
    WHERE l.embedding IS NOT NULL
  )
  SELECT
    s.id,
    s.position_title,
    s.company_name,
    s.region,
    s.industry,
    GREATEST(0, s.similarity)::FLOAT AS similarity
  FROM semantic s
  WHERE s.similarity > 0.35
  ORDER BY s.similarity DESC, s.created_at DESC
  LIMIT p_limit;

  IF NOT FOUND THEN
    RETURN QUERY
    SELECT
      m.placement_id,
      m.position_title,
      m.company_name,
      m.region,
      m.industry,
      m.match_score::FLOAT AS similarity
    FROM public.match_profile_to_jobs(p_user_id, p_limit) m;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.match_profile_to_jobs TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_jobs_by_embedding TO authenticated;

COMMENT ON FUNCTION public.match_profile_to_jobs IS 'Hybrid rule-based profile matching across placements and ingested listings feed';
COMMENT ON FUNCTION public.match_jobs_by_embedding IS 'AI-first embedding match against listings feed with safe fallback to rule-based profile matching';

COMMIT;
