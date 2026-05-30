-- Migration: Add trigram indexes to speed up placement search on company_name and ensure pg_trgm is enabled

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram index for case-insensitive partial matches on company_name
CREATE INDEX IF NOT EXISTS placements_company_name_trgm_idx 
  ON public.placements 
  USING GIN (company_name gin_trgm_ops);

COMMIT;
