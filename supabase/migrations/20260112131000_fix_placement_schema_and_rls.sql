-- Migration: Fix Placement Schema and RLS Permissions
-- Resolves 400 (Bad Request) and 403 (Forbidden) errors during Excel upload and auth sync

BEGIN;

-- 1. Add missing columns to public.placements
ALTER TABLE public.placements 
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS deadline timestamptz,
  ADD COLUMN IF NOT EXISTS application_link text;

-- 2. Fix RLS for profiles table
-- Ensure admins have full access to profiles
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Admins have full access to profiles'
    ) THEN
        CREATE POLICY "Admins have full access to profiles" ON public.profiles
            FOR ALL
            TO authenticated
            USING (public.is_admin())
            WITH CHECK (public.is_admin());
    END IF;
END $$;

-- Ensure users can upsert their own profile (Support for AuthProvider sync)
-- Upsert requires both INSERT and UPDATE permissions
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Users can insert their own profile'
    ) THEN
        CREATE POLICY "Users can insert their own profile" ON public.profiles
            FOR INSERT
            TO authenticated
            WITH CHECK (auth.uid() = id);
    END IF;
END $$;

-- 3. Fix RLS for placements table
-- Ensure admins have full access to placements
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'placements' 
        AND policyname = 'Admins have full access to placements'
    ) THEN
        CREATE POLICY "Admins have full access to placements" ON public.placements
            FOR ALL
            TO authenticated
            USING (public.is_admin())
            WITH CHECK (public.is_admin());
    END IF;
END $$;

COMMIT;
