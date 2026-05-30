-- COMPREHENSIVE PRODUCTION REPAIR MIGRATION
-- This script defensively ensures all expected columns and tables exist.

BEGIN;

-- 1. FIX BOOSTS TABLE
DO $$ 
BEGIN
  -- Rename post_id to entity_id if post_id exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'boosts' AND column_name = 'post_id') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'boosts' AND column_name = 'entity_id') THEN
    ALTER TABLE public.boosts RENAME COLUMN post_id TO entity_id;
  END IF;

  -- Rename boost_until to ends_at if boost_until exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'boosts' AND column_name = 'boost_until') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'boosts' AND column_name = 'ends_at') THEN
    ALTER TABLE public.boosts RENAME COLUMN boost_until TO ends_at;
  END IF;

  -- Ensure entity_id exists (if neither old nor new existed)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'boosts' AND column_name = 'entity_id') THEN
    ALTER TABLE public.boosts ADD COLUMN entity_id uuid;
  END IF;

  -- Ensure ends_at exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'boosts' AND column_name = 'ends_at') THEN
    ALTER TABLE public.boosts ADD COLUMN ends_at timestamptz NOT NULL DEFAULT (now() + interval '7 days');
  END IF;

  -- Ensure other required columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'boosts' AND column_name = 'entity_type') THEN
    ALTER TABLE public.boosts ADD COLUMN entity_type text NOT NULL DEFAULT 'listing';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'boosts' AND column_name = 'starts_at') THEN
    ALTER TABLE public.boosts ADD COLUMN starts_at timestamptz NOT NULL DEFAULT now();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'boosts' AND column_name = 'is_active') THEN
    ALTER TABLE public.boosts ADD COLUMN is_active boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- 2. FIX PROFILES TABLE
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'location') THEN
    ALTER TABLE public.profiles ADD COLUMN location text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'experience_level') THEN
    ALTER TABLE public.profiles ADD COLUMN experience_level text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'availability_status') THEN
    ALTER TABLE public.profiles ADD COLUMN availability_status text DEFAULT 'Available';
  END IF;
END $$;

-- 3. FIX LISTINGS TABLE & RLS
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'listings') THEN
    CREATE TABLE public.listings (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
      title text NOT NULL,
      description text NOT NULL,
      is_featured boolean NOT NULL DEFAULT false,
      display_order integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  END IF;

  ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'listings' AND policyname = 'Public view listings') THEN
    CREATE POLICY "Public view listings" ON public.listings FOR SELECT USING (true);
  END IF;
END $$;

-- 4. ENSURE ANALYTICS_EVENTS TABLE
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analytics_events') THEN
    CREATE TABLE public.analytics_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      event_name text NOT NULL,
      user_id uuid REFERENCES auth.users(id),
      session_id text,
      props jsonb DEFAULT '{}'::jsonb,
      timestamp timestamptz DEFAULT now(),
      created_at timestamptz DEFAULT now()
    );
    ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
    -- Only service role usually writes to this via Edge Function, but let's add a basic policy
    CREATE POLICY "Service can manage analytics" ON public.analytics_events FOR ALL USING (true);
  END IF;
END $$;

COMMIT;
