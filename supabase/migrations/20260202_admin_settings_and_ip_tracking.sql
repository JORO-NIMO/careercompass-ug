-- Admin settings and user IP tracking

BEGIN;

-- Helper: is_admin() function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

-- Admin settings key/value store
CREATE TABLE IF NOT EXISTS public.admin_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage admin_settings" ON public.admin_settings;
CREATE POLICY "Admins manage admin_settings" ON public.admin_settings
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Seed defaults if missing
INSERT INTO public.admin_settings (key, value)
VALUES
  ('ai_token_daily_quota', '{"value":150000}'::jsonb),
  ('ai_token_alert_threshold', '{"value":0.9}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- User IP addresses
CREATE TABLE IF NOT EXISTS public.user_ip_addresses (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  ip inet NOT NULL,
  user_agent text,
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  flagged boolean NOT NULL DEFAULT false,
  flagged_reason text,
  flagged_at timestamptz,
  flagged_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_user_ip_addresses_user ON public.user_ip_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ip_addresses_ip ON public.user_ip_addresses(ip);

ALTER TABLE public.user_ip_addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read user_ip_addresses" ON public.user_ip_addresses;
CREATE POLICY "Admins read user_ip_addresses" ON public.user_ip_addresses
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins update user_ip_addresses" ON public.user_ip_addresses;
CREATE POLICY "Admins update user_ip_addresses" ON public.user_ip_addresses
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Optional: allow users to see their own IPs
DROP POLICY IF EXISTS "Users read their own IPs" ON public.user_ip_addresses;
CREATE POLICY "Users read their own IPs" ON public.user_ip_addresses
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- RPC to upsert user IP
CREATE OR REPLACE FUNCTION public.upsert_user_ip(p_user_id uuid, p_ip inet, p_user_agent text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.user_ip_addresses (user_id, ip, user_agent)
  VALUES (p_user_id, p_ip, p_user_agent)
  ON CONFLICT (user_id, ip) DO UPDATE
  SET user_agent = EXCLUDED.user_agent,
      last_seen = now();
EXCEPTION WHEN undefined_column THEN
  -- If no unique constraint exists, perform manual upsert
  PERFORM 1 FROM public.user_ip_addresses WHERE user_id = p_user_id AND ip = p_ip;
  IF FOUND THEN
    UPDATE public.user_ip_addresses
      SET user_agent = p_user_agent,
          last_seen = now()
    WHERE user_id = p_user_id AND ip = p_ip;
  ELSE
    INSERT INTO public.user_ip_addresses (user_id, ip, user_agent)
    VALUES (p_user_id, p_ip, p_user_agent);
  END IF;
END;
$$;

-- Ensure unique constraint for efficient upsert
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'user_ip_user_ip_unique'
  ) THEN
    BEGIN
      ALTER TABLE public.user_ip_addresses ADD CONSTRAINT user_ip_user_ip_unique UNIQUE (user_id, ip);
    EXCEPTION WHEN duplicate_table THEN
      NULL;
    END;
  END IF;
END $$;

-- Helper to fetch admin setting value
CREATE OR REPLACE FUNCTION public.get_admin_setting(p_key text)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT value FROM public.admin_settings WHERE key = p_key;
$$;

COMMIT;
