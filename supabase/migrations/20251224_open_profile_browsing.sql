-- Allow all visitors to read public candidate profiles while keeping writes protected
-- Apply via supabase db push

DROP POLICY IF EXISTS "Authenticated users can browse profiles" ON public.profiles;
CREATE POLICY "Anyone can browse profiles"
  ON public.profiles
  FOR SELECT
  TO public
  USING (true);
