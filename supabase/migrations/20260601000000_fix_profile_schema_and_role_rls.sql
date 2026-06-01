-- Fix production profile schema drift and recursive role RLS checks.
-- The UI currently reads/writes extended profile fields and checks roles from
-- RLS policies; keep both paths idempotent for already-partially-migrated DBs.

BEGIN;

-- -----------------------------------------------------------------------------
-- Profiles: add the columns currently used by the web app, Edge Functions, and
-- smoke tests. Missing columns surface in PostgREST as 400/42703 errors.
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS notification_sms boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS experience_level text,
  ADD COLUMN IF NOT EXISTS availability_status text DEFAULT 'Available',
  ADD COLUMN IF NOT EXISTS cv_url text,
  ADD COLUMN IF NOT EXISTS school_name text,
  ADD COLUMN IF NOT EXISTS course_of_study text,
  ADD COLUMN IF NOT EXISTS year_of_study text,
  ADD COLUMN IF NOT EXISTS portfolio_url text,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS career_level text,
  ADD COLUMN IF NOT EXISTS preferred_opportunity_types text[],
  ADD COLUMN IF NOT EXISTS preferred_countries text[],
  ADD COLUMN IF NOT EXISTS notification_email boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notification_push boolean DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_profiles_phone
  ON public.profiles (phone)
  WHERE phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_completed
  ON public.profiles (onboarding_completed)
  WHERE onboarding_completed = false;

-- Existing users may predate the not-null default above.
UPDATE public.profiles
SET notification_sms = true
WHERE notification_sms IS NULL;

-- -----------------------------------------------------------------------------
-- Role helpers: SECURITY DEFINER + row_security off prevents recursive RLS when
-- a policy on user_roles (or a policy that indirectly checks user_roles) asks if
-- the current user is an admin/employer.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::public.app_role);
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

-- Recreate role policies after the helper is safe. The admin policy intentionally
-- still uses has_role, now executed with RLS disabled inside the helper.
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Profile upserts from the client need INSERT permission if the auth trigger did
-- not create a row or a legacy account predates profile creation.
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Keep onboarding RPCs aligned with the hook/modal payload, including SMS.
CREATE OR REPLACE FUNCTION public.complete_onboarding(
  p_user_id uuid,
  p_career_level text DEFAULT NULL,
  p_opportunity_types text[] DEFAULT NULL,
  p_countries text[] DEFAULT NULL,
  p_areas_of_interest text[] DEFAULT NULL,
  p_notification_email boolean DEFAULT true,
  p_notification_push boolean DEFAULT true,
  p_notification_sms boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  UPDATE public.profiles
  SET
    onboarding_completed = true,
    career_level = COALESCE(p_career_level, career_level),
    preferred_opportunity_types = COALESCE(p_opportunity_types, preferred_opportunity_types),
    preferred_countries = COALESCE(p_countries, preferred_countries),
    areas_of_interest = COALESCE(p_areas_of_interest, areas_of_interest),
    notification_email = COALESCE(p_notification_email, notification_email, true),
    notification_push = COALESCE(p_notification_push, notification_push, true),
    notification_sms = COALESCE(p_notification_sms, notification_sms, true),
    updated_at = now()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Onboarding completed');
END;
$$;

CREATE OR REPLACE FUNCTION public.get_onboarding_status(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN jsonb_build_object('onboarding_completed', false, 'error', 'Not authorized');
  END IF;

  SELECT jsonb_build_object(
    'onboarding_completed', COALESCE(onboarding_completed, false),
    'career_level', career_level,
    'preferred_opportunity_types', preferred_opportunity_types,
    'preferred_countries', preferred_countries,
    'areas_of_interest', areas_of_interest,
    'notification_email', COALESCE(notification_email, true),
    'notification_push', COALESCE(notification_push, true),
    'notification_sms', COALESCE(notification_sms, true)
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

GRANT EXECUTE ON FUNCTION public.complete_onboarding(uuid, text, text[], text[], text[], boolean, boolean, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_onboarding_status(uuid) TO authenticated;

COMMIT;
