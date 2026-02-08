-- Migration: Onboarding Fields
-- Adds onboarding completion tracking and user preferences
-- Created: 2026-02-07

BEGIN;

-- ============================================================================
-- ADD ONBOARDING FIELDS TO PROFILES
-- ============================================================================

-- Add onboarding_completed flag
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Add career interest fields from onboarding
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS career_level TEXT; -- student, entry, mid, senior, other

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS preferred_opportunity_types TEXT[]; -- scholarship, fellowship, internship, job, training, grant

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS preferred_countries TEXT[]; -- Uganda, Kenya, Global, Remote, etc.

-- Add notification preferences from onboarding
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS notification_email BOOLEAN DEFAULT true;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS notification_push BOOLEAN DEFAULT true;

-- ============================================================================
-- CREATE INDEX FOR ONBOARDING STATUS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_completed 
ON public.profiles(onboarding_completed) 
WHERE onboarding_completed = false;

-- ============================================================================
-- FUNCTION TO COMPLETE ONBOARDING
-- ============================================================================

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

-- ============================================================================
-- FUNCTION TO CHECK ONBOARDING STATUS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_onboarding_status(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'onboarding_completed', COALESCE(onboarding_completed, false),
    'career_level', career_level,
    'preferred_opportunity_types', preferred_opportunity_types,
    'preferred_countries', preferred_countries,
    'areas_of_interest', areas_of_interest,
    'notification_email', COALESCE(notification_email, true),
    'notification_push', COALESCE(notification_push, true)
  )
  INTO v_result
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_result IS NULL THEN
    RETURN jsonb_build_object('onboarding_completed', false);
  END IF;

  RETURN v_result;
END;
$$;

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT EXECUTE ON FUNCTION complete_onboarding TO authenticated;
GRANT EXECUTE ON FUNCTION get_onboarding_status TO authenticated;

COMMENT ON FUNCTION complete_onboarding IS 'Complete user onboarding and save preferences';
COMMENT ON FUNCTION get_onboarding_status IS 'Get onboarding status and preferences for a user';

COMMIT;
