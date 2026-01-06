-- Migration: Admin Listings Policy Fix
-- Grants admins full control over curated listings

DO $$ 
BEGIN
  -- 1. Ensure admins can perform all actions on listings
  -- We use is_admin() helper defined in types.ts (or corresponding SQL helper)
  -- Based on types.ts, there is an is_admin() function in the public schema
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'listings' AND policyname = 'Admins have full access to listings') THEN
    CREATE POLICY "Admins have full access to listings" ON public.listings 
      FOR ALL 
      TO authenticated 
      USING (is_admin()) 
      WITH CHECK (is_admin());
  END IF;

  -- 2. Ensure public can still view (handled by 'Public view listings' policy usually, but let's be safe)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'listings' AND policyname = 'Public can view listings') THEN
    CREATE POLICY "Public can view listings" ON public.listings 
      FOR SELECT 
      USING (true);
  END IF;

END $$;
