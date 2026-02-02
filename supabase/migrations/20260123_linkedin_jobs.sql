-- LinkedIn Jobs Staging Table
-- Stores scraped jobs before AI validation and auto-posting to listings
BEGIN;

CREATE TABLE IF NOT EXISTS public.linkedin_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  company text NOT NULL,
  location text,
  description text NOT NULL,
  job_url text UNIQUE NOT NULL,
  posted_date date,
  scraped_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  ai_analysis jsonb DEFAULT '{}'::jsonb,
  is_approved boolean DEFAULT false,
  is_posted boolean DEFAULT false,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_linkedin_jobs_approval_status 
  ON public.linkedin_jobs (is_approved, is_posted) 
  WHERE is_approved = true AND is_posted = false;

CREATE INDEX IF NOT EXISTS idx_linkedin_jobs_scraped_at 
  ON public.linkedin_jobs (scraped_at DESC);

CREATE INDEX IF NOT EXISTS idx_linkedin_jobs_job_url 
  ON public.linkedin_jobs (job_url);

-- Cleanup function: deletes jobs older than 30 days
CREATE OR REPLACE FUNCTION public.cleanup_old_linkedin_jobs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.linkedin_jobs
  WHERE scraped_at < now() - interval '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- RLS Policies
ALTER TABLE public.linkedin_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access" ON public.linkedin_jobs;
CREATE POLICY "Service role full access"
  ON public.linkedin_jobs
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view linkedin_jobs" ON public.linkedin_jobs;
CREATE POLICY "Admins can view linkedin_jobs"
  ON public.linkedin_jobs
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

COMMIT;
