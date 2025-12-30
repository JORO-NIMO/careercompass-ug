-- Migration: Listings & Posts Enhancement
-- Adds publishing controls, media fields, and audit logging

BEGIN;

-- 1. Enhance Listings Table
ALTER TABLE public.listings 
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  ADD COLUMN IF NOT EXISTS published_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS banner_urls text[] DEFAULT '{}';

-- 2. Create Posts Table (Announcements/Updates)
CREATE TABLE IF NOT EXISTS public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL, -- Supports rich text/HTML
  category text DEFAULT 'Announcements' CHECK (category IN ('Placements', 'Announcements', 'Updates')),
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  scheduled_for timestamptz,
  image_url text,
  cta_text text,
  cta_link text,
  created_at timestamptz DEFAULT now(),
  published_at timestamptz,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now()
);

-- 3. Create Admin Audit Logs Table
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES auth.users(id),
  action text NOT NULL, -- 'create', 'update', 'delete', 'publish', 'archive'
  target_table text NOT NULL,
  target_id uuid NOT NULL,
  changes jsonb,
  timestamp timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Posts
DROP POLICY IF EXISTS "Public can view published posts" ON public.posts;
CREATE POLICY "Public can view published posts" ON public.posts
  FOR SELECT USING (status = 'published' AND (scheduled_for IS NULL OR scheduled_for <= now()));

DROP POLICY IF EXISTS "Admins have full control over posts" ON public.posts;
CREATE POLICY "Admins have full control over posts" ON public.posts
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- RLS Policies for Audit Logs
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can view audit logs" ON public.admin_audit_logs
  FOR SELECT TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "System/Admins can insert audit logs" ON public.admin_audit_logs;
CREATE POLICY "System/Admins can insert audit logs" ON public.admin_audit_logs
  FOR INSERT TO authenticated WITH CHECK (is_admin());

-- 4. Cleanup Mock/Test Data
-- This is a one-time cleanup during migration.
DELETE FROM public.listings 
WHERE title ILIKE '%test%' 
   OR title ILIKE '%demo%' 
   OR title ILIKE '%mock%' 
   OR title ILIKE '%placeholder%';

DELETE FROM public.companies 
WHERE name ILIKE '%test%' 
   OR name ILIKE '%demo%' 
   OR name ILIKE '%mock%' 
   OR name ILIKE '%placeholder%';

DELETE FROM public.placements 
WHERE position_title ILIKE '%test%' 
   OR position_title ILIKE '%demo%' 
   OR position_title ILIKE '%mock%' 
   OR position_title ILIKE '%placeholder%';

COMMIT;
