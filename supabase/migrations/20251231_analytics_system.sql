-- Migration: Privacy-First Analytics System

-- 1. Create Visitors Table
CREATE TABLE IF NOT EXISTS public.analytics_visitors (
    id uuid PRIMARY KEY, -- Client-generated UUID (from localStorage)
    first_seen_at timestamptz DEFAULT now(),
    last_seen_at timestamptz DEFAULT now(),
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- Optional link to auth user
    user_agent text -- Optional: Store UA string for bot detection/device type (can be privacy filtered later)
);

-- 2. Create Page Views Table
CREATE TABLE IF NOT EXISTS public.analytics_page_views (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    visitor_id uuid REFERENCES public.analytics_visitors(id) ON DELETE CASCADE,
    path text NOT NULL,
    referrer text,
    viewed_at timestamptz DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.analytics_visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_page_views ENABLE ROW LEVEL SECURITY;

-- 4. Policies

-- Visitors: Public can insert/update their own (via RPC usually, but allow insert for tracking)
-- Actually, better to rely on RPC with SECURITY DEFINER for upserts to avoid complex RLS on "ids I lay claim to via localstorage"
-- But we can allow public insert for now.
CREATE POLICY "Public can insert visitors" ON public.analytics_visitors FOR INSERT TO public WITH CHECK (true);
-- No public select/update on visitors table directly needed by client usually, but RPC handles updates.
-- Admins can view all
CREATE POLICY "Admins can view visitors" ON public.analytics_visitors FOR SELECT TO authenticated USING (public.is_admin());

-- Page Views: Public can insert
CREATE POLICY "Public can log page views" ON public.analytics_page_views FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Admins can view page views" ON public.analytics_page_views FOR SELECT TO authenticated USING (public.is_admin());

-- 5. RPC: Track Visit (Atomic Upsert + Insert)
CREATE OR REPLACE FUNCTION public.track_visit(
    p_visitor_id uuid,
    p_path text,
    p_referrer text DEFAULT NULL,
    p_user_id uuid DEFAULT NULL,
    p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 1. Upsert Visitor
    INSERT INTO public.analytics_visitors (id, last_seen_at, user_id, user_agent)
    VALUES (p_visitor_id, now(), p_user_id, p_user_agent)
    ON CONFLICT (id) DO UPDATE
    SET 
        last_seen_at = now(),
        user_id = COALESCE(EXCLUDED.user_id, public.analytics_visitors.user_id), -- Keep existing if new is null
        user_agent = COALESCE(EXCLUDED.user_agent, public.analytics_visitors.user_agent);

    -- 2. Log Page View
    INSERT INTO public.analytics_page_views (visitor_id, path, referrer)
    VALUES (p_visitor_id, p_path, p_referrer);
END;
$$;

-- 6. RPC: Get Metrics (for Dashboard)
CREATE OR REPLACE FUNCTION public.get_analytics_metrics(
    period_start timestamptz DEFAULT (now() - interval '30 days')
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_unique_visitors int;
    total_page_views int;
    active_now int;
    top_pages json;
BEGIN
    -- Count Unique Visitors (Approximate total ever)
    SELECT count(*) INTO total_unique_visitors FROM public.analytics_visitors;

    -- Count Page Views (Period)
    SELECT count(*) INTO total_page_views 
    FROM public.analytics_page_views 
    WHERE viewed_at >= period_start;

    -- Active Now (Last 5 mins)
    SELECT count(*) INTO active_now
    FROM public.analytics_visitors
    WHERE last_seen_at >= (now() - interval '5 minutes');

    -- Top Pages
    SELECT json_agg(t) INTO top_pages
    FROM (
        SELECT path, count(*) as views
        FROM public.analytics_page_views
        WHERE viewed_at >= period_start
        GROUP BY path
        ORDER BY views DESC
        LIMIT 10
    ) t;

    RETURN json_build_object(
        'unique_visitors', total_unique_visitors,
        'page_views', total_page_views,
        'active_now', active_now,
        'top_pages', COALESCE(top_pages, '[]'::json)
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.track_visit(uuid, text, text, uuid, text) TO public;
GRANT EXECUTE ON FUNCTION public.get_analytics_metrics(timestamptz) TO public; -- Or restrict to admins if preferred, but public counter might need some data
