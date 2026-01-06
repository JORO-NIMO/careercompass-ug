-- Migration: AI Crawler & Scoring Engine
-- Tables for managing external job sources and AI matching

-- 1. Crawler Sources (The Target List)
CREATE TABLE IF NOT EXISTS public.crawler_sources (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    base_url text NOT NULL,
    careers_page_url text NOT NULL,
    last_crawled_at timestamptz,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- 2. Crawled Jobs (Staging Area)
CREATE TABLE IF NOT EXISTS public.crawled_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id uuid REFERENCES public.crawler_sources(id),
    title text NOT NULL,
    company_name text,
    job_url text NOT NULL,
    description_summary text,
    deadline timestamptz,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'auto-published')),
    created_at timestamptz DEFAULT now(),
    UNIQUE(job_url) -- Prevent duplicates
);

-- 3. Application Matches (AI Scores)
CREATE TABLE IF NOT EXISTS public.application_matches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    listing_id uuid REFERENCES public.listings(id) ON DELETE CASCADE,
    match_score integer CHECK (match_score >= 0 AND match_score <= 100),
    match_feedback text,
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id, listing_id)
);

-- Enable RLS
ALTER TABLE public.crawler_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crawled_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_matches ENABLE ROW LEVEL SECURITY;

-- Policies (Admins only for Crawler)
CREATE POLICY "Admins can manage crawler sources" ON public.crawler_sources
    FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admins can manage crawled jobs" ON public.crawled_jobs
    FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Policies for Matches (User can see their own, Admins see all)
CREATE POLICY "Users view own matches" ON public.application_matches
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins view all matches" ON public.application_matches
    FOR SELECT TO authenticated USING (is_admin());

-- Insert some default Uganda Sources
INSERT INTO public.crawler_sources (name, base_url, careers_page_url) VALUES
('NSSF Uganda', 'https://www.nssfug.org', 'https://www.nssfug.org/careers'),
('URA', 'https://www.ura.go.ug', 'https://www.ura.go.ug/jobs'),
('MTN Uganda', 'https://www.mtn.co.ug', 'https://www.mtn.co.ug/careers'),
('Uganda National Roads Authority', 'https://www.unra.go.ug', 'https://www.unra.go.ug/careers');
