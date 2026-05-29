-- Smoke checks for SMS opt-in, canonical matching, dedupe, and delivery analytics.
-- Run with: psql "$DATABASE_URL" -f scripts/smoke-sms-routing.sql
BEGIN;

DO $$
DECLARE
  v_user uuid := gen_random_uuid();
  v_company uuid := gen_random_uuid();
  v_listing uuid;
  v_alert uuid;
  v_count integer;
BEGIN
  INSERT INTO auth.users (id, email) VALUES (v_user, 'sms-smoke@example.com');

  INSERT INTO public.profiles (id, email, full_name, phone, notification_sms, areas_of_interest)
  VALUES (v_user, 'sms-smoke@example.com', 'SMS Smoke', '+256700000000', true, ARRAY['ICT / Technology']);

  IF NOT ('technology' = ANY((SELECT areas_of_interest FROM public.profiles WHERE id = v_user))) THEN
    RAISE EXCEPTION 'Interest normalization failed';
  END IF;

  SELECT public.subscribe_job_alerts(v_user, '{"keywords":["software"]}'::jsonb, ARRAY['sms']) INTO v_alert;
  IF v_alert IS NULL THEN
    RAISE EXCEPTION 'SMS alert subscription failed';
  END IF;

  INSERT INTO public.companies (id, name, owner_id, approved)
  VALUES (v_company, 'Smoke Co', v_user, true);

  INSERT INTO public.listings (company_id, title, description)
  VALUES (v_company, 'Software Engineer', 'Build cloud software for schools')
  RETURNING id INTO v_listing;

  SELECT public.notify_listing_interest_matches(v_listing) INTO v_count;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'Listing notification dedupe failed; expected 0 after trigger inserted, got %', v_count;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.notifications WHERE user_id = v_user AND listing_id = v_listing AND 'sms' = ANY(channel)) THEN
    RAISE EXCEPTION 'SMS listing notification was not created';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.get_sms_delivery_stats(1)) THEN
    RAISE EXCEPTION 'SMS analytics returned no rows';
  END IF;
END $$;

ROLLBACK;
