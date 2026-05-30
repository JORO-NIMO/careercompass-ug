-- COMPREHENSIVE BACKEND FIX (v2)
-- Resolves: 500 Recursion, 404 RPCs, and 400 Bad Requests
-- Date: 2026-03-15

BEGIN;

-- 1. ANALYTICS INFRASTRUCTURE
-- (Required for PageVisitCounter)
CREATE TABLE IF NOT EXISTS public.analytics_visitors (
    id uuid PRIMARY KEY,
    first_seen_at timestamptz DEFAULT now(),
    last_seen_at timestamptz DEFAULT now(),
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    user_agent text
);

CREATE TABLE IF NOT EXISTS public.analytics_page_views (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    visitor_id uuid REFERENCES public.analytics_visitors(id) ON DELETE CASCADE,
    path text NOT NULL,
    referrer text,
    viewed_at timestamptz DEFAULT now()
);

-- Legacy table used by older log_page_visit implementation
CREATE TABLE IF NOT EXISTS public.page_visits_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  path text,
  user_id uuid REFERENCES auth.users(id),
  user_agent text,
  country text,
  visited_at timestamptz DEFAULT now()
);

ALTER TABLE public.analytics_visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_visits_log ENABLE ROW LEVEL SECURITY;

-- Permissions
DROP POLICY IF EXISTS "Public can insert visitors" ON public.analytics_visitors;
CREATE POLICY "Public can insert visitors" ON public.analytics_visitors FOR INSERT TO public WITH CHECK (true);
DROP POLICY IF EXISTS "Public can log page views" ON public.analytics_page_views;
CREATE POLICY "Public can log page views" ON public.analytics_page_views FOR INSERT TO public WITH CHECK (true);
DROP POLICY IF EXISTS "Anyone can log visits" ON public.page_visits_log;
CREATE POLICY "Anyone can log visits" ON public.page_visits_log FOR INSERT TO public WITH CHECK (true);

-- 2. RESOLVE RLS RECURSION
-- Redefine core roles check functions to bypass RLS

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
END;
$$;

-- Simplify user_roles Policy
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') IS NOT NULL
);

-- 3. FIX RPCS
-- Drop existing overloads to avoid PostgREST ambiguity (400 errors)
DROP FUNCTION IF EXISTS public.log_page_visit(text);
DROP FUNCTION IF EXISTS public.log_page_visit(text, uuid);

CREATE OR REPLACE FUNCTION public.log_page_visit(p_path text, p_user_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.page_visits_log (path, user_id)
  VALUES (p_path, p_user_id);
END;
$$;

-- Counter RPC expected by Feb 16 frontend
DROP FUNCTION IF EXISTS public.get_analytics_metrics();
DROP FUNCTION IF EXISTS public.get_analytics_metrics(timestamptz);

CREATE OR REPLACE FUNCTION public.get_analytics_metrics(
    period_start timestamptz DEFAULT (now() - interval '30 days')
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    active_now int;
BEGIN
    -- Simplified version for public counter
    SELECT count(*) INTO active_now
    FROM public.analytics_visitors
    WHERE last_seen_at >= (now() - interval '5 minutes');

    RETURN json_build_object(
        'active_now', COALESCE(active_now, 0)
    );
END;
$$;

-- Grants
GRANT EXECUTE ON FUNCTION public.log_page_visit(text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.log_page_visit(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_analytics_metrics(timestamptz) TO anon;
GRANT EXECUTE ON FUNCTION public.get_analytics_metrics(timestamptz) TO authenticated;

COMMIT;
