BEGIN;

-- Persist phone + SMS onboarding consent server-side.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_sms boolean NOT NULL DEFAULT false;

-- Allow SMS in the general opportunity subscription channel list where the table exists.
DO $$
BEGIN
  IF to_regclass('public.opportunity_subscriptions') IS NOT NULL THEN
    ALTER TABLE public.opportunity_subscriptions DROP CONSTRAINT IF EXISTS valid_channels;
    ALTER TABLE public.opportunity_subscriptions
      ADD CONSTRAINT valid_channels CHECK (
        channels <@ ARRAY['email', 'push', 'in_app', 'sms']::text[]
      );
  END IF;
END;
$$;

-- Delivery analytics fields for notification records.
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS sms_status text CHECK (sms_status IS NULL OR sms_status IN ('pending', 'sent', 'failed', 'skipped')),
  ADD COLUMN IF NOT EXISTS sms_provider text,
  ADD COLUMN IF NOT EXISTS sms_provider_message_id text,
  ADD COLUMN IF NOT EXISTS sms_error text;

CREATE INDEX IF NOT EXISTS idx_notifications_sms_status
  ON public.notifications(sms_status)
  WHERE sms_status IS NOT NULL;

-- Preference upserts should update one row per user/channel/type instead of creating duplicates.
DELETE FROM public.notification_preferences a
USING public.notification_preferences b
WHERE a.ctid < b.ctid
  AND a.user_id = b.user_id
  AND a.channel = b.channel
  AND a.type = b.type;

CREATE UNIQUE INDEX IF NOT EXISTS notification_preferences_user_channel_type_key
  ON public.notification_preferences(user_id, channel, type);


-- Normalize legacy and free-form areas of interest into canonical ids used by onboarding.
CREATE OR REPLACE FUNCTION public.canonical_interest_field(p_value text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v text := lower(trim(coalesce(p_value, '')));
BEGIN
  v := regexp_replace(v, '[^a-z0-9]+', '_', 'g');
  v := regexp_replace(v, '^_+|_+$', '', 'g');

  RETURN CASE
    WHEN v IN ('ict_technology', 'ict', 'it', 'technology', 'tech', 'software', 'software_engineering', 'computer_science', 'data_science', 'ai', 'artificial_intelligence') THEN 'technology'
    WHEN v IN ('business_finance', 'business', 'finance', 'accounting', 'banking', 'economics') THEN 'business_finance'
    WHEN v IN ('engineering', 'engineer', 'civil_engineering', 'mechanical_engineering', 'electrical_engineering') THEN 'engineering'
    WHEN v IN ('health_medicine', 'health', 'medicine', 'medical', 'public_health', 'nursing') THEN 'health_medicine'
    WHEN v IN ('education', 'teaching', 'teacher', 'training') THEN 'education'
    WHEN v IN ('development_ngo', 'development', 'ngo', 'nonprofit', 'non_profit', 'humanitarian') THEN 'development_ngo'
    WHEN v IN ('agriculture', 'agri', 'farming', 'agribusiness') THEN 'agriculture'
    WHEN v IN ('arts_media', 'arts', 'media', 'creative', 'communications', 'journalism') THEN 'arts_media'
    WHEN v IN ('law_governance', 'law', 'legal', 'governance', 'policy', 'public_policy') THEN 'law_governance'
    WHEN v IN ('science_research', 'science', 'research', 'scientific_research') THEN 'science_research'
    ELSE NULLIF(v, '')
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.canonical_interest_fields(p_values text[])
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(array_agg(DISTINCT public.canonical_interest_field(value)) FILTER (WHERE public.canonical_interest_field(value) IS NOT NULL), ARRAY[]::text[])
  FROM unnest(COALESCE(p_values, ARRAY[]::text[])) AS value;
$$;

UPDATE public.profiles
SET areas_of_interest = public.canonical_interest_fields(areas_of_interest),
    updated_at = COALESCE(updated_at, now())
WHERE areas_of_interest IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_canonical_interests_gin
  ON public.profiles USING gin (areas_of_interest);

-- Keep future profile writes canonical.
CREATE OR REPLACE FUNCTION public.normalize_profile_interests()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.areas_of_interest := public.canonical_interest_fields(NEW.areas_of_interest);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_profiles_normalize_interests ON public.profiles;
CREATE TRIGGER tr_profiles_normalize_interests
  BEFORE INSERT OR UPDATE OF areas_of_interest ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_profile_interests();

-- Complete onboarding now accepts SMS consent and canonicalizes interests.
CREATE OR REPLACE FUNCTION public.complete_onboarding(
  p_user_id uuid,
  p_career_level text DEFAULT NULL,
  p_opportunity_types text[] DEFAULT NULL,
  p_countries text[] DEFAULT NULL,
  p_areas_of_interest text[] DEFAULT NULL,
  p_notification_email boolean DEFAULT true,
  p_notification_push boolean DEFAULT true,
  p_notification_sms boolean DEFAULT false
)
RETURNS jsonb
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
    areas_of_interest = CASE WHEN p_areas_of_interest IS NULL THEN areas_of_interest ELSE public.canonical_interest_fields(p_areas_of_interest) END,
    notification_email = COALESCE(p_notification_email, notification_email),
    notification_push = COALESCE(p_notification_push, notification_push),
    notification_sms = COALESCE(p_notification_sms, notification_sms),
    updated_at = now()
  WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true, 'onboarding_completed', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_onboarding_status(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'onboarding_completed', COALESCE(onboarding_completed, false),
    'career_level', career_level,
    'preferred_opportunity_types', preferred_opportunity_types,
    'preferred_countries', preferred_countries,
    'areas_of_interest', areas_of_interest,
    'notification_email', COALESCE(notification_email, true),
    'notification_push', COALESCE(notification_push, true),
    'notification_sms', COALESCE(notification_sms, false)
  )
  INTO v_result
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_result IS NULL THEN
    RETURN jsonb_build_object('onboarding_completed', false, 'notification_sms', false);
  END IF;

  RETURN v_result;
END;
$$;

-- Canonical indexed candidate matching for a listing. This is the single routing primitive.
CREATE OR REPLACE FUNCTION public.match_profiles_for_listing(p_listing_id uuid)
RETURNS TABLE(user_id uuid, matched_fields text[])
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title text;
  v_description text;
  v_field text;
  v_industry text;
  v_opportunity_type text;
  v_target_fields text[] := ARRAY[]::text[];
BEGIN
  SELECT
    title,
    description,
    CASE WHEN to_jsonb(listings) ? 'field' THEN to_jsonb(listings)->>'field' ELSE NULL END,
    CASE WHEN to_jsonb(listings) ? 'industry' THEN to_jsonb(listings)->>'industry' ELSE NULL END,
    CASE WHEN to_jsonb(listings) ? 'opportunity_type' THEN to_jsonb(listings)->>'opportunity_type' ELSE NULL END
  INTO v_title, v_description, v_field, v_industry, v_opportunity_type
  FROM public.listings
  WHERE id = p_listing_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_target_fields := public.canonical_interest_fields(ARRAY[v_field, v_industry, v_opportunity_type]);

  v_target_fields := v_target_fields || CASE WHEN concat_ws(' ', v_title, v_description) ~* '(software|developer|ict|data|ai|cloud|cyber|devops)' THEN ARRAY['technology']::text[] ELSE ARRAY[]::text[] END;
  v_target_fields := v_target_fields || CASE WHEN concat_ws(' ', v_title, v_description) ~* '(finance|accounting|audit|business|bank|investment|economics)' THEN ARRAY['business_finance']::text[] ELSE ARRAY[]::text[] END;
  v_target_fields := v_target_fields || CASE WHEN concat_ws(' ', v_title, v_description) ~* '(engineer|mechanical|electrical|civil|manufacturing|infrastructure)' THEN ARRAY['engineering']::text[] ELSE ARRAY[]::text[] END;
  v_target_fields := v_target_fields || CASE WHEN concat_ws(' ', v_title, v_description) ~* '(health|medical|nurse|clinical|hospital|public health|pharma)' THEN ARRAY['health_medicine']::text[] ELSE ARRAY[]::text[] END;
  v_target_fields := v_target_fields || CASE WHEN concat_ws(' ', v_title, v_description) ~* '(education|teacher|lecturer|curriculum|school|university|training)' THEN ARRAY['education']::text[] ELSE ARRAY[]::text[] END;
  v_target_fields := v_target_fields || CASE WHEN concat_ws(' ', v_title, v_description) ~* '(ngo|development|humanitarian|community|livelihoods|program officer)' THEN ARRAY['development_ngo']::text[] ELSE ARRAY[]::text[] END;
  v_target_fields := v_target_fields || CASE WHEN concat_ws(' ', v_title, v_description) ~* '(agriculture|agri|farming|crop|livestock|agronomy|food systems)' THEN ARRAY['agriculture']::text[] ELSE ARRAY[]::text[] END;
  v_target_fields := v_target_fields || CASE WHEN concat_ws(' ', v_title, v_description) ~* '(media|content|design|creative|journalism|communications|brand)' THEN ARRAY['arts_media']::text[] ELSE ARRAY[]::text[] END;
  v_target_fields := v_target_fields || CASE WHEN concat_ws(' ', v_title, v_description) ~* '(law|legal|compliance|policy|governance|regulation|advocacy)' THEN ARRAY['law_governance']::text[] ELSE ARRAY[]::text[] END;
  v_target_fields := v_target_fields || CASE WHEN concat_ws(' ', v_title, v_description) ~* '(research|laboratory|scientist|analysis|innovation|evidence)' THEN ARRAY['science_research']::text[] ELSE ARRAY[]::text[] END;

  SELECT COALESCE(array_agg(DISTINCT field), ARRAY[]::text[])
  INTO v_target_fields
  FROM unnest(v_target_fields) field
  WHERE field IS NOT NULL AND field <> '';

  IF cardinality(v_target_fields) = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT p.id, ARRAY(SELECT unnest(p.areas_of_interest) INTERSECT SELECT unnest(v_target_fields))
  FROM public.profiles p
  WHERE p.areas_of_interest && v_target_fields;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_listing_interest_matches(p_listing_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, message, channel, metadata, sent_at)
  SELECT
    m.user_id,
    'opportunity_match',
    'New Match: ' || l.title,
    COALESCE(c.name, 'A company') || ' just posted a new role that matches your interests.',
    COALESCE(c.name, 'A company') || ' just posted a new role that matches your interests.',
    ARRAY['in_app']::text[],
    jsonb_build_object('listing_id', l.id, 'target_fields', m.matched_fields, 'routing_engine', 'match_profiles_for_listing'),
    now()
  FROM public.match_profiles_for_listing(p_listing_id) m
  JOIN public.listings l ON l.id = p_listing_id
  LEFT JOIN public.companies c ON c.id = l.company_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.on_listing_created_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.notify_listing_interest_matches(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_listing_created_notify ON public.listings;
CREATE TRIGGER tr_listing_created_notify
  AFTER INSERT ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.on_listing_created_notify();

-- Validate SMS alert subscriptions against persisted phone + explicit SMS consent.
CREATE OR REPLACE FUNCTION public.subscribe_job_alerts(
  p_user_id uuid,
  p_criteria jsonb DEFAULT '{}',
  p_channels text[] DEFAULT ARRAY['push']
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_channels text[];
  v_phone text;
  v_sms_opt_in boolean;
BEGIN
  SELECT phone, COALESCE(notification_sms, false)
  INTO v_phone, v_sms_opt_in
  FROM public.profiles
  WHERE id = p_user_id;

  v_channels := ARRAY(
    SELECT DISTINCT channel
    FROM unnest(COALESCE(p_channels, ARRAY['push']::text[])) channel
    WHERE channel = ANY(ARRAY['push', 'email', 'sms', 'in_app']::text[])
  );

  IF 'sms' = ANY(v_channels) AND (COALESCE(v_sms_opt_in, false) = false OR NULLIF(trim(COALESCE(v_phone, '')), '') IS NULL) THEN
    RAISE EXCEPTION 'SMS alerts require a saved phone number and SMS notification opt-in';
  END IF;

  INSERT INTO public.job_alerts (user_id, criteria, channels)
  VALUES (p_user_id, p_criteria, v_channels)
  ON CONFLICT (user_id) DO UPDATE
  SET
    criteria = EXCLUDED.criteria,
    channels = EXCLUDED.channels,
    active = true,
    updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.canonical_interest_field(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.canonical_interest_fields(text[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.match_profiles_for_listing(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.notify_listing_interest_matches(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.subscribe_job_alerts(uuid, jsonb, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_onboarding(uuid, text, text[], text[], text[], boolean, boolean, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_onboarding_status(uuid) TO authenticated;

COMMIT;
