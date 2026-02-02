-- Migration: Add RPC to return distinct regions and industries for placements

BEGIN;

CREATE OR REPLACE FUNCTION admin_distinct_placement_filters()
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'regions', (
      SELECT COALESCE(json_agg(r.region ORDER BY r.region), '[]'::json)
      FROM (
        SELECT DISTINCT region FROM public.placements WHERE region IS NOT NULL
      ) r
    ),
    'industries', (
      SELECT COALESCE(json_agg(i.industry ORDER BY i.industry), '[]'::json)
      FROM (
        SELECT DISTINCT industry FROM public.placements WHERE industry IS NOT NULL
      ) i
    )
  );
$$;

COMMENT ON FUNCTION admin_distinct_placement_filters() IS 'Returns distinct regions and industries for placements as JSON arrays';

COMMIT;
