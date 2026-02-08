-- Migration: Hybrid Search (Vector + Keyword)
-- Combines semantic vector similarity with full-text keyword search
-- Formula: score = (0.6 * vector_similarity) + (0.4 * keyword_rank)
-- Created: 2026-02-07

BEGIN;

-- ============================================================================
-- ADD TSVECTOR COLUMN FOR FULL-TEXT SEARCH
-- ============================================================================

-- Add tsvector column if it doesn't exist
ALTER TABLE public.opportunities
ADD COLUMN IF NOT EXISTS search_vector TSVECTOR;

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_opportunities_search_vector
ON public.opportunities USING GIN(search_vector);

-- ============================================================================
-- FUNCTION TO UPDATE SEARCH VECTOR
-- ============================================================================

CREATE OR REPLACE FUNCTION update_opportunity_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.organization, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.type, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.field, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.country, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'D');
  RETURN NEW;
END;
$$;

-- Trigger to auto-update search vector on insert/update
DROP TRIGGER IF EXISTS trigger_opportunities_search_vector ON public.opportunities;
CREATE TRIGGER trigger_opportunities_search_vector
  BEFORE INSERT OR UPDATE OF title, organization, description, type, field, country
  ON public.opportunities
  FOR EACH ROW
  EXECUTE FUNCTION update_opportunity_search_vector();

-- ============================================================================
-- BACKFILL EXISTING RECORDS
-- ============================================================================

UPDATE public.opportunities SET
  search_vector =
    setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(organization, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(type, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(field, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(country, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(description, '')), 'D')
WHERE search_vector IS NULL;

-- ============================================================================
-- HYBRID SEARCH FUNCTION
-- Combines vector similarity (60%) with keyword ranking (40%)
-- ============================================================================

CREATE OR REPLACE FUNCTION hybrid_search_opportunities(
  query_embedding VECTOR(1536),
  query_text TEXT,
  match_threshold FLOAT DEFAULT 0.3,
  match_count INT DEFAULT 10,
  filter_type TEXT DEFAULT NULL,
  filter_field TEXT DEFAULT NULL,
  filter_country TEXT DEFAULT NULL,
  vector_weight FLOAT DEFAULT 0.6,
  keyword_weight FLOAT DEFAULT 0.4
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  organization TEXT,
  description TEXT,
  url TEXT,
  type TEXT,
  field TEXT,
  country TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  vector_score FLOAT,
  keyword_score FLOAT,
  hybrid_score FLOAT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tsquery TSQUERY;
  v_query_text TEXT;
BEGIN
  -- Normalize weights to ensure they sum to 1
  IF vector_weight + keyword_weight != 1.0 THEN
    vector_weight := 0.6;
    keyword_weight := 0.4;
  END IF;

  -- Prepare tsquery from search text
  v_query_text := COALESCE(NULLIF(TRIM(query_text), ''), NULL);
  IF v_query_text IS NOT NULL THEN
    -- Convert to tsquery with prefix matching for partial words
    v_tsquery := plainto_tsquery('english', v_query_text);
  END IF;

  RETURN QUERY
  WITH scored AS (
    SELECT
      o.id,
      o.title,
      o.organization,
      o.description,
      o.url,
      o.type,
      o.field,
      o.country,
      o.published_at,
      o.created_at,
      -- Vector similarity score (0-1)
      CASE
        WHEN o.embedding IS NOT NULL AND query_embedding IS NOT NULL
        THEN GREATEST(0, (1 - (o.embedding <=> query_embedding)))::FLOAT
        ELSE 0::FLOAT
      END AS v_score,
      -- Keyword score (normalized 0-1)
      CASE
        WHEN v_tsquery IS NOT NULL AND o.search_vector IS NOT NULL
        THEN LEAST(1, ts_rank_cd(o.search_vector, v_tsquery, 32)::FLOAT)
        ELSE 0::FLOAT
      END AS k_score
    FROM public.opportunities o
    WHERE
      -- Apply filters
      (filter_type IS NULL OR o.type ILIKE filter_type)
      AND (filter_field IS NULL OR o.field ILIKE '%' || filter_field || '%')
      AND (filter_country IS NULL OR o.country ILIKE '%' || filter_country || '%')
      -- Must have either vector or keyword match
      AND (
        (o.embedding IS NOT NULL AND query_embedding IS NOT NULL AND (1 - (o.embedding <=> query_embedding)) > match_threshold)
        OR (v_tsquery IS NOT NULL AND o.search_vector @@ v_tsquery)
        -- Include ILIKE fallback for partial matches
        OR (v_query_text IS NOT NULL AND (
          o.title ILIKE '%' || v_query_text || '%'
          OR o.organization ILIKE '%' || v_query_text || '%'
        ))
      )
  )
  SELECT
    s.id,
    s.title,
    s.organization,
    s.description,
    s.url,
    s.type,
    s.field,
    s.country,
    s.published_at,
    s.created_at,
    s.v_score AS vector_score,
    s.k_score AS keyword_score,
    (vector_weight * s.v_score + keyword_weight * s.k_score)::FLOAT AS hybrid_score
  FROM scored s
  WHERE s.v_score > 0 OR s.k_score > 0
  ORDER BY
    (vector_weight * s.v_score + keyword_weight * s.k_score) DESC,
    s.created_at DESC
  LIMIT match_count;
END;
$$;

-- ============================================================================
-- KEYWORD-ONLY SEARCH (for when no embedding is available)
-- ============================================================================

CREATE OR REPLACE FUNCTION keyword_search_opportunities(
  query_text TEXT,
  match_count INT DEFAULT 10,
  filter_type TEXT DEFAULT NULL,
  filter_field TEXT DEFAULT NULL,
  filter_country TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  organization TEXT,
  description TEXT,
  url TEXT,
  type TEXT,
  field TEXT,
  country TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  keyword_score FLOAT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tsquery TSQUERY;
  v_query_text TEXT;
BEGIN
  v_query_text := COALESCE(NULLIF(TRIM(query_text), ''), NULL);
  
  IF v_query_text IS NULL THEN
    -- No query, return recent opportunities
    RETURN QUERY
    SELECT
      o.id,
      o.title,
      o.organization,
      o.description,
      o.url,
      o.type,
      o.field,
      o.country,
      o.published_at,
      o.created_at,
      1.0::FLOAT AS keyword_score
    FROM public.opportunities o
    WHERE
      (filter_type IS NULL OR o.type ILIKE filter_type)
      AND (filter_field IS NULL OR o.field ILIKE '%' || filter_field || '%')
      AND (filter_country IS NULL OR o.country ILIKE '%' || filter_country || '%')
    ORDER BY o.created_at DESC
    LIMIT match_count;
    RETURN;
  END IF;

  v_tsquery := plainto_tsquery('english', v_query_text);

  RETURN QUERY
  SELECT
    o.id,
    o.title,
    o.organization,
    o.description,
    o.url,
    o.type,
    o.field,
    o.country,
    o.published_at,
    o.created_at,
    CASE
      WHEN o.search_vector @@ v_tsquery
      THEN LEAST(1, ts_rank_cd(o.search_vector, v_tsquery, 32)::FLOAT)
      ELSE 0.1::FLOAT  -- Base score for ILIKE matches
    END AS keyword_score
  FROM public.opportunities o
  WHERE
    (filter_type IS NULL OR o.type ILIKE filter_type)
    AND (filter_field IS NULL OR o.field ILIKE '%' || filter_field || '%')
    AND (filter_country IS NULL OR o.country ILIKE '%' || filter_country || '%')
    AND (
      o.search_vector @@ v_tsquery
      OR o.title ILIKE '%' || v_query_text || '%'
      OR o.organization ILIKE '%' || v_query_text || '%'
    )
  ORDER BY
    CASE
      WHEN o.search_vector @@ v_tsquery
      THEN ts_rank_cd(o.search_vector, v_tsquery, 32)
      ELSE 0.1
    END DESC,
    o.created_at DESC
  LIMIT match_count;
END;
$$;

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT EXECUTE ON FUNCTION hybrid_search_opportunities TO authenticated, anon;
GRANT EXECUTE ON FUNCTION keyword_search_opportunities TO authenticated, anon;
GRANT EXECUTE ON FUNCTION update_opportunity_search_vector TO authenticated;

COMMENT ON FUNCTION hybrid_search_opportunities IS 'Hybrid search combining vector similarity (60%) with keyword ranking (40%)';
COMMENT ON FUNCTION keyword_search_opportunities IS 'Keyword-only search using tsvector full-text search';

COMMIT;
