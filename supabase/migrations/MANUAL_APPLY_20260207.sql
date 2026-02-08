-- ============================================================================
-- CONSOLIDATED MIGRATION: Chat Messages + Hybrid Search + Onboarding
-- Run this in Supabase SQL Editor if CLI migrations fail
-- Created: 2026-02-07
--
-- PREREQUISITES: Ensure opportunities table exists first!
-- Run 20260206_01_opportunities_table.sql before this if not already applied.
-- ============================================================================

-- Check if opportunities table exists (pre-flight check)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'opportunities') THEN
    RAISE EXCEPTION 'opportunities table does not exist. Run 20260206_01_opportunities_table.sql first!';
  END IF;
END $$;

-- Check if profiles table exists (pre-flight check)  
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    RAISE EXCEPTION 'profiles table does not exist. This should exist from initial schema!';
  END IF;
END $$;

-- ============================================================================
-- PART 1: CHAT MESSAGES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL DEFAULT gen_random_uuid(),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_created ON chat_messages(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created ON chat_messages(session_id, created_at DESC);

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop if exists pattern for idempotency)
DROP POLICY IF EXISTS "Users can view own chat messages" ON chat_messages;
CREATE POLICY "Users can view own chat messages"
  ON chat_messages FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own chat messages" ON chat_messages;
CREATE POLICY "Users can insert own chat messages"
  ON chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can insert chat messages" ON chat_messages;
CREATE POLICY "Service role can insert chat messages"
  ON chat_messages FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete own chat messages" ON chat_messages;
CREATE POLICY "Users can delete own chat messages"
  ON chat_messages FOR DELETE
  USING (auth.uid() = user_id);

-- Chat history RPC
DROP FUNCTION IF EXISTS get_chat_history(uuid,uuid,integer);
CREATE OR REPLACE FUNCTION get_chat_history(
  p_user_id UUID,
  p_session_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  role TEXT,
  content TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_session_id IS NOT NULL THEN
    RETURN QUERY
    SELECT cm.id, cm.role, cm.content, cm.created_at
    FROM chat_messages cm
    WHERE cm.session_id = p_session_id
    ORDER BY cm.created_at DESC
    LIMIT p_limit;
  ELSE
    RETURN QUERY
    SELECT cm.id, cm.role, cm.content, cm.created_at
    FROM chat_messages cm
    WHERE cm.user_id = p_user_id
    ORDER BY cm.created_at DESC
    LIMIT p_limit;
  END IF;
END;
$$;

-- Save chat message RPC
CREATE OR REPLACE FUNCTION save_chat_message(
  p_user_id UUID,
  p_session_id UUID,
  p_role TEXT,
  p_content TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_message_id UUID;
BEGIN
  INSERT INTO chat_messages (user_id, session_id, role, content, metadata)
  VALUES (p_user_id, p_session_id, p_role, p_content, p_metadata)
  RETURNING id INTO v_message_id;
  
  RETURN v_message_id;
END;
$$;

-- Cleanup old messages RPC
CREATE OR REPLACE FUNCTION cleanup_old_chat_messages(
  p_keep_count INT DEFAULT 100
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INT := 0;
BEGIN
  WITH ranked AS (
    SELECT id, user_id, created_at,
           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
    FROM chat_messages
  ),
  to_delete AS (
    SELECT id FROM ranked WHERE rn > p_keep_count
  )
  DELETE FROM chat_messages
  WHERE id IN (SELECT id FROM to_delete);
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- ============================================================================
-- PART 2: HYBRID SEARCH
-- ============================================================================

-- Add tsvector column for full-text search
ALTER TABLE public.opportunities
ADD COLUMN IF NOT EXISTS search_vector TSVECTOR;

-- GIN index for full-text search
CREATE INDEX IF NOT EXISTS idx_opportunities_search_vector
ON public.opportunities USING GIN(search_vector);

-- Function to update search vector
CREATE OR REPLACE FUNCTION update_opportunity_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.organization, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.type, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.field, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.country, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'D');
  RETURN NEW;
END;
$$;

-- Trigger for auto-update
DROP TRIGGER IF EXISTS trigger_opportunities_search_vector ON public.opportunities;
CREATE TRIGGER trigger_opportunities_search_vector
  BEFORE INSERT OR UPDATE OF title, organization, description, type, field, country
  ON public.opportunities
  FOR EACH ROW
  EXECUTE FUNCTION update_opportunity_search_vector();

-- Backfill existing records
UPDATE public.opportunities SET
  search_vector =
    setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(organization, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(type, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(field, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(country, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(description, '')), 'D')
WHERE search_vector IS NULL;

-- Hybrid search function
DROP FUNCTION IF EXISTS hybrid_search_opportunities(vector,text,float,integer,text,text,text,float,float);
CREATE OR REPLACE FUNCTION hybrid_search_opportunities(
  query_embedding VECTOR(1536),
  query_text TEXT,
  match_threshold FLOAT DEFAULT 0.3,
  match_count INT DEFAULT 10,
  filter_type TEXT DEFAULT NULL,
  filter_field TEXT DEFAULT NULL,
  filter_country TEXT DEFAULT NULL,
  vector_weight FLOAT DEFAULT 0.6,
  keyword_weight FLOAT DEFAULT 0.4
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  organization TEXT,
  description TEXT,
  url TEXT,
  type TEXT,
  field TEXT,
  country TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  vector_score FLOAT,
  keyword_score FLOAT,
  hybrid_score FLOAT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tsquery TSQUERY;
  v_query_text TEXT;
BEGIN
  v_query_text := COALESCE(NULLIF(TRIM(query_text), ''), NULL);
  
  IF v_query_text IS NOT NULL THEN
    v_tsquery := plainto_tsquery('english', v_query_text);
  END IF;

  RETURN QUERY
  SELECT
    o.id,
    o.title,
    o.organization,
    o.description,
    o.url,
    o.type,
    o.field,
    o.country,
    o.published_at,
    o.created_at,
    CASE WHEN o.embedding IS NOT NULL 
      THEN (1 - (o.embedding <=> query_embedding))::FLOAT 
      ELSE 0.0 
    END AS vector_score,
    CASE WHEN v_tsquery IS NOT NULL AND o.search_vector IS NOT NULL
      THEN ts_rank_cd(o.search_vector, v_tsquery)::FLOAT
      ELSE 0.0
    END AS keyword_score,
    (
      CASE WHEN o.embedding IS NOT NULL 
        THEN (1 - (o.embedding <=> query_embedding)) * vector_weight 
        ELSE 0.0 
      END +
      CASE WHEN v_tsquery IS NOT NULL AND o.search_vector IS NOT NULL
        THEN ts_rank_cd(o.search_vector, v_tsquery) * keyword_weight
        ELSE 0.0
      END
    )::FLOAT AS hybrid_score
  FROM public.opportunities o
  WHERE
    (
      (o.embedding IS NOT NULL AND (1 - (o.embedding <=> query_embedding)) > match_threshold)
      OR
      (v_tsquery IS NOT NULL AND o.search_vector @@ v_tsquery)
    )
    AND (filter_type IS NULL OR o.type ILIKE filter_type)
    AND (filter_field IS NULL OR o.field ILIKE '%' || filter_field || '%')
    AND (filter_country IS NULL OR o.country ILIKE '%' || filter_country || '%')
  ORDER BY hybrid_score DESC
  LIMIT match_count;
END;
$$;

-- Keyword-only search function  
DROP FUNCTION IF EXISTS keyword_search_opportunities(text,integer,text,text,text);
CREATE OR REPLACE FUNCTION keyword_search_opportunities(
  query_text TEXT,
  match_count INT DEFAULT 10,
  filter_type TEXT DEFAULT NULL,
  filter_field TEXT DEFAULT NULL,
  filter_country TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  organization TEXT,
  description TEXT,
  url TEXT,
  type TEXT,
  field TEXT,
  country TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  rank FLOAT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tsquery TSQUERY;
BEGIN
  v_tsquery := plainto_tsquery('english', COALESCE(query_text, ''));

  RETURN QUERY
  SELECT
    o.id,
    o.title,
    o.organization,
    o.description,
    o.url,
    o.type,
    o.field,
    o.country,
    o.published_at,
    o.created_at,
    ts_rank_cd(o.search_vector, v_tsquery)::FLOAT AS rank
  FROM public.opportunities o
  WHERE
    o.search_vector @@ v_tsquery
    AND (filter_type IS NULL OR o.type ILIKE filter_type)
    AND (filter_field IS NULL OR o.field ILIKE '%' || filter_field || '%')
    AND (filter_country IS NULL OR o.country ILIKE '%' || filter_country || '%')
  ORDER BY rank DESC
  LIMIT match_count;
END;
$$;

-- ============================================================================
-- PART 3: ONBOARDING FIELDS
-- ============================================================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS career_level TEXT;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS preferred_opportunity_types TEXT[];

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS preferred_countries TEXT[];

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS notification_email BOOLEAN DEFAULT true;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS notification_push BOOLEAN DEFAULT true;

-- Index for incomplete onboarding
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_completed 
ON public.profiles(onboarding_completed) 
WHERE onboarding_completed = false;

-- Complete onboarding function
CREATE OR REPLACE FUNCTION complete_onboarding(
  p_user_id UUID,
  p_career_level TEXT DEFAULT NULL,
  p_opportunity_types TEXT[] DEFAULT NULL,
  p_countries TEXT[] DEFAULT NULL,
  p_areas_of_interest TEXT[] DEFAULT NULL,
  p_notification_email BOOLEAN DEFAULT true,
  p_notification_push BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    onboarding_completed = true,
    career_level = COALESCE(p_career_level, career_level),
    preferred_opportunity_types = COALESCE(p_opportunity_types, preferred_opportunity_types),
    preferred_countries = COALESCE(p_countries, preferred_countries),
    areas_of_interest = COALESCE(p_areas_of_interest, areas_of_interest),
    notification_email = p_notification_email,
    notification_push = p_notification_push,
    updated_at = NOW()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Onboarding completed');
END;
$$;

-- Check onboarding status function (returns summary)
CREATE OR REPLACE FUNCTION check_onboarding_status(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_completed BOOLEAN;
  v_career_level TEXT;
  v_opportunity_types TEXT[];
BEGIN
  SELECT 
    onboarding_completed,
    career_level,
    preferred_opportunity_types
  INTO v_completed, v_career_level, v_opportunity_types
  FROM public.profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'completed', false,
      'has_profile', false
    );
  END IF;

  RETURN jsonb_build_object(
    'completed', COALESCE(v_completed, false),
    'has_profile', true,
    'has_career_level', v_career_level IS NOT NULL,
    'has_interests', v_opportunity_types IS NOT NULL AND array_length(v_opportunity_types, 1) > 0
  );
END;
$$;

-- Get full onboarding status (returns all fields for frontend)
CREATE OR REPLACE FUNCTION get_onboarding_status(p_user_id UUID)
RETURNS TABLE (
  onboarding_completed BOOLEAN,
  career_level TEXT,
  preferred_opportunity_types TEXT[],
  preferred_countries TEXT[],
  areas_of_interest TEXT[],
  notification_email BOOLEAN,
  notification_push BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(p.onboarding_completed, false),
    p.career_level,
    p.preferred_opportunity_types,
    p.preferred_countries,
    p.areas_of_interest,
    COALESCE(p.notification_email, true),
    COALESCE(p.notification_push, true)
  FROM public.profiles p
  WHERE p.id = p_user_id;
END;
$$;

-- ============================================================================
-- DONE!
-- ============================================================================
SELECT 'Migration completed successfully!' AS status;
