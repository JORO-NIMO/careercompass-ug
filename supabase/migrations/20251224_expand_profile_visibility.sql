-- Broaden visibility for placements and profiles so users can browse listings and candidates
-- Run with Supabase migration tooling

-- Allow both authenticated and anonymous visitors to read placements
DROP POLICY IF EXISTS "Anyone can view placements" ON public.placements;
CREATE POLICY "Anyone can view placements"
  ON public.placements
  FOR SELECT
  TO public
  USING (true);

-- Let all signed-in users view each other's profiles
CREATE POLICY IF NOT EXISTS "Authenticated users can browse profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);
