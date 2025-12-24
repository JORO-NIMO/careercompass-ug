-- Allow employers to browse candidate profiles and capture richer directory data
-- Run with Supabase migration tooling

-- Extend app_role enum with employer qualification
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'employer';

-- Capture optional public profile attributes useful for employer discovery
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS experience_level text,
  ADD COLUMN IF NOT EXISTS availability_status text;

-- Allow employer role to view candidate profiles (admins already covered by previous policy)
CREATE POLICY "Employers can view candidate profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'employer'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );
