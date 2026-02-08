-- Migration: Semantic Search Functions for Opportunities
-- Provides vector similarity search and text search RPCs
-- Created: 2026-02-05

BEGIN;

-- ============================================================================
-- SEMANTIC SEARCH RPC
-- Uses vector cosine similarity for AI-powered search
-- ============================================================================

CREATE OR REPLACE FUNCTION match_opportunities_semantic(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.5,
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
  similarity FLOAT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
    (1 - (o.embedding <=> query_embedding))::FLOAT AS similarity
  FROM public.opportunities o
  WHERE
    o.embedding IS NOT NULL
    AND (1 - (o.embedding <=> query_embedding)) > match_threshold
    AND (filter_type IS NULL OR o.type ILIKE filter_type)
    AND (filter_field IS NULL OR o.field ILIKE '%' || filter_field || '%')
    AND (filter_country IS NULL OR o.country ILIKE '%' || filter_country || '%')
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- ============================================================================
-- TEXT-BASED SEARCH RPC (fallback when no embedding)
-- ============================================================================

CREATE OR REPLACE FUNCTION search_opportunities(
  p_query TEXT DEFAULT '',
  p_type TEXT DEFAULT NULL,
  p_field TEXT DEFAULT NULL,
  p_country TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
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
      WHEN v_query IS NOT NULL THEN
        GREATEST(
          similarity(o.title, v_query),
          similarity(COALESCE(o.organization, ''), v_query),
          similarity(COALESCE(o.description, ''), v_query) * 0.5
        )
      ELSE 1.0
    END AS rank
  FROM public.opportunities o
  WHERE
    (p_type IS NULL OR o.type ILIKE p_type)
    AND (p_field IS NULL OR o.field ILIKE '%' || p_field || '%')
    AND (p_country IS NULL OR o.country ILIKE '%' || p_country || '%')
    AND (
      v_query IS NULL
      OR o.title ILIKE '%' || v_query || '%'
      OR o.organization ILIKE '%' || v_query || '%'
      OR o.description ILIKE '%' || v_query || '%'
    )
  ORDER BY
    CASE WHEN v_query IS NOT NULL THEN
      GREATEST(
        similarity(o.title, v_query),
        similarity(COALESCE(o.organization, ''), v_query)
      )
    ELSE 0 END DESC,
    o.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- ============================================================================
-- GET OPPORTUNITIES STATS
-- For admin dashboard
-- ============================================================================

CREATE OR REPLACE FUNCTION get_opportunities_stats()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_count', (SELECT COUNT(*) FROM public.opportunities),
    'with_embeddings', (SELECT COUNT(*) FROM public.opportunities WHERE embedding IS NOT NULL),
    'by_type', (
      SELECT jsonb_object_agg(COALESCE(type, 'Unknown'), cnt)
      FROM (SELECT type, COUNT(*) as cnt FROM public.opportunities GROUP BY type) t
    ),
    'by_country', (
      SELECT jsonb_object_agg(COALESCE(country, 'Unknown'), cnt)
      FROM (SELECT country, COUNT(*) as cnt FROM public.opportunities GROUP BY country ORDER BY cnt DESC LIMIT 10) c
    ),
    'sources_count', (SELECT COUNT(*) FROM public.rss_sources WHERE is_active = true),
    'last_ingestion', (
      SELECT jsonb_build_object(
        'status', status,
        'items_inserted', items_inserted,
        'completed_at', completed_at
      )
      FROM public.opportunity_ingestion_logs
      ORDER BY started_at DESC
      LIMIT 1
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT EXECUTE ON FUNCTION match_opportunities_semantic TO authenticated, anon;
GRANT EXECUTE ON FUNCTION search_opportunities TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_opportunities_stats TO authenticated;

COMMENT ON FUNCTION match_opportunities_semantic IS 'Semantic search for opportunities using vector similarity';
COMMENT ON FUNCTION search_opportunities IS 'Text-based search for opportunities with filters';
COMMENT ON FUNCTION get_opportunities_stats IS 'Get statistics about opportunities for admin dashboard';

COMMIT;
