-- Fix RLS policies and optimize search (Hash Map / Inverted Index implementation)

BEGIN;

-- 1. FIX: Company Visibility
-- Issue: Only owners and admins could see companies.
-- Fix: Allow anyone to view companies that are APPROVED.
CREATE POLICY "Public can view approved companies"
  ON public.companies
  FOR SELECT
  USING (approved = true);

-- 2. FIX: Profile Saving
-- Issue: Users had no permission to UPDATE their own profile.
-- Fix: Add policy for self-update.
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 3. OPTIMIZATION: Search Implementation ("Hash Map" equivalent)
-- To provide O(1)-like search performance, we implement GIN (Generalized Inverted Index)
-- This allows instant lookups for text and array contains, typically much faster than B-Tree for this use case.

-- Enable pg_trgm extension for fuzzy text search if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Index for Company Name Search
CREATE INDEX IF NOT EXISTS companies_name_trgm_idx 
  ON public.companies 
  USING GIN (name gin_trgm_ops);

-- Index for Placement Title Search
CREATE INDEX IF NOT EXISTS placements_title_trgm_idx 
  ON public.placements 
  USING GIN (position_title gin_trgm_ops);

-- Index for Candidate Skills (Array Search)
-- Allows instant lookup of "Candidates with skill X"
CREATE INDEX IF NOT EXISTS profiles_skills_gin_idx 
  ON public.profiles 
  USING GIN (areas_of_interest);

COMMIT;
