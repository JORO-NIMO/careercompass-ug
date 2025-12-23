-- Fix is_admin() function to use existing has_role() function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.has_role(auth.uid(), 'admin'::app_role);
END;
$$;

-- Add approved column to placements table for review workflow
ALTER TABLE public.placements ADD COLUMN IF NOT EXISTS approved boolean NOT NULL DEFAULT false;

-- Add policy for authenticated users to submit placements for review
CREATE POLICY "Users can submit placements for review"
  ON public.placements FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by AND approved = false
  );

-- Enable RLS on external_cache table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'external_cache') THEN
    ALTER TABLE public.external_cache ENABLE ROW LEVEL SECURITY;
    
    -- Only authenticated users can read cache entries
    EXECUTE 'CREATE POLICY "Authenticated users can read cache" ON public.external_cache FOR SELECT TO authenticated USING (true)';
    
    -- Only service role (edge functions) can write to cache - this policy denies all user writes
    -- Edge functions use service role which bypasses RLS
  END IF;
END
$$;