-- Enable authenticated company users to create and cancel boosts for their own listings
-- Apply with Supabase migration tooling

CREATE POLICY IF NOT EXISTS "Users can boost their listings"
  ON public.boosts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = poster_id);

CREATE POLICY IF NOT EXISTS "Users can cancel their boosts"
  ON public.boosts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = poster_id);

CREATE POLICY IF NOT EXISTS "Admins can manage boosts"
  ON public.boosts
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
