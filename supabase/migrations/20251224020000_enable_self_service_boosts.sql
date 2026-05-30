-- Enable authenticated company users to create and cancel boosts for their own listings
-- Apply with Supabase migration tooling

DROP POLICY IF EXISTS "Users can boost their listings" ON public.boosts;
CREATE POLICY "Users can boost their listings"
  ON public.boosts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = poster_id);

DROP POLICY IF EXISTS "Users can cancel their boosts" ON public.boosts;
CREATE POLICY "Users can cancel their boosts"
  ON public.boosts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = poster_id);

DROP POLICY IF EXISTS "Admins can manage boosts" ON public.boosts;
CREATE POLICY "Admins can manage boosts"
  ON public.boosts
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
