-- Migration: Enable pg_trgm extension for text similarity search
-- Required for the similarity() function used in search_opportunities
-- Created: 2026-02-05

BEGIN;

-- Enable pg_trgm extension for fuzzy text matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN index for faster text search on opportunities
CREATE INDEX IF NOT EXISTS idx_opportunities_title_trgm 
  ON public.opportunities USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_opportunities_description_trgm 
  ON public.opportunities USING gin (description gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_opportunities_organization_trgm 
  ON public.opportunities USING gin (organization gin_trgm_ops);

COMMIT;
