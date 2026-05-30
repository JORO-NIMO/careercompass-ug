-- Allow employers to browse candidate profiles and capture richer directory data
-- Run with Supabase migration tooling

-- Extend app_role enum with employer qualification
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'employer';

-- Capture optional public profile attributes useful for employer discovery
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS experience_level text,
  ADD COLUMN IF NOT EXISTS availability_status text;
