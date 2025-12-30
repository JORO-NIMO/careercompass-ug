-- Migration: Fix Analytics Logging

-- 1. Ensure table exists
CREATE TABLE IF NOT EXISTS public.page_visits_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  path text,
  user_agent text,
  country text,
  visited_at timestamptz DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.page_visits_log ENABLE ROW LEVEL SECURITY;

-- 3. Policies
-- Allow anyone (anon + auth) to insert (log a visit)
DROP POLICY IF EXISTS "Anyone can log visits" ON public.page_visits_log;
CREATE POLICY "Anyone can log visits"
ON public.page_visits_log
FOR INSERT
TO public
WITH CHECK (true);

-- Allow anyone to read (for the counter) - or restrict to RPC only
-- We'll allow public select count for now to be simple
DROP POLICY IF EXISTS "Anyone can read visits" ON public.page_visits_log;
CREATE POLICY "Anyone can read visits"
ON public.page_visits_log
FOR SELECT
TO public
USING (true);

-- 4. RPC to Log Visit (Optional, but good for cleanliness)
CREATE OR REPLACE FUNCTION public.log_page_visit(p_path text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.page_visits_log (path) VALUES (p_path);
END;
$$;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION public.log_page_visit(text) TO anon;
GRANT EXECUTE ON FUNCTION public.log_page_visit(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_page_visit(text) TO service_role;
