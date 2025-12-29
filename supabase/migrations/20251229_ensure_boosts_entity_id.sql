-- Ensure the boosts table has the correct entity_id column
-- This migration is defensive and will only rename if post_id exists and entity_id is missing

BEGIN;

DO $$ 
BEGIN
  -- Check if entity_id exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'boosts' 
    AND column_name = 'entity_id'
  ) THEN
    -- If entity_id is missing, check if post_id exists to rename it
    IF EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'boosts' 
      AND column_name = 'post_id'
    ) THEN
      ALTER TABLE public.boosts RENAME COLUMN post_id TO entity_id;
    ELSE
      -- If both are missing, something is wrong, but let's try to add it
      ALTER TABLE public.boosts ADD COLUMN entity_id uuid;
    END IF;
  END IF;
END $$;

-- Also ensure other columns from the update_boosts_schema migration exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'boosts' AND column_name = 'entity_type') THEN
    ALTER TABLE public.boosts ADD COLUMN entity_type text NOT NULL DEFAULT 'listing';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'boosts' AND column_name = 'starts_at') THEN
    ALTER TABLE public.boosts ADD COLUMN starts_at timestamptz NOT NULL DEFAULT now();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'boosts' AND column_name = 'is_active') THEN
    ALTER TABLE public.boosts ADD COLUMN is_active boolean NOT NULL DEFAULT true;
  END IF;

  -- Ensure ends_at exists (renamed from boost_until)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'boosts' AND column_name = 'ends_at') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'boosts' AND column_name = 'boost_until') THEN
      ALTER TABLE public.boosts RENAME COLUMN boost_until TO ends_at;
    ELSE
      ALTER TABLE public.boosts ADD COLUMN ends_at timestamptz NOT NULL DEFAULT (now() + interval '7 days');
    END IF;
  END IF;
END $$;

-- Ensure listings table exists (backfill if the previous migration failed)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'listings') THEN
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
    
    ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Public view listings" ON public.listings FOR SELECT USING (true);
    
    -- Admins manage listings
    CREATE POLICY "Admins manage listings" ON public.listings FOR ALL 
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

COMMIT;
