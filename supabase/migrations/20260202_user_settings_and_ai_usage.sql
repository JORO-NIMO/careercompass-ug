-- Migration: User Settings and AI Usage Analytics

BEGIN;

-- 1. Create user_settings table to persist assistant preferences
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  assistant_prefs jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated users can select/update their own settings; admins can view all
DROP POLICY IF EXISTS "Users manage their own settings" ON public.user_settings;
CREATE POLICY "Users manage their own settings" ON public.user_settings
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all settings" ON public.user_settings;
CREATE POLICY "Admins can view all settings" ON public.user_settings
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- 2. AI usage summary view for analytics (optional convenience)
CREATE VIEW IF NOT EXISTS public.ai_usage_daily AS
SELECT
  date_trunc('day', timestamp) AS day,
  count(*) FILTER (WHERE event_name = 'ai.assistant.ask') AS asks,
  count(*) FILTER (WHERE event_name = 'ai.assistant.response') AS responses,
  sum((props->>'total_tokens')::int) FILTER (WHERE event_name = 'ai.token.usage' AND (props->>'total_tokens') IS NOT NULL) AS total_tokens
FROM public.analytics_events
GROUP BY 1
ORDER BY 1 DESC;

COMMIT;
