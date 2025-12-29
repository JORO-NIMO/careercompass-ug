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
END $$;

COMMIT;
