-- Migration: Update AI usage daily view to align with assistant events

BEGIN;

DROP VIEW IF EXISTS public.ai_usage_daily;

CREATE VIEW public.ai_usage_daily AS
SELECT
  date_trunc('day', timestamp) AS day,
  count(*) FILTER (WHERE event_name = 'assistant.ask') AS asks,
  count(*) FILTER (WHERE event_name = 'assistant.response') AS responses,
  sum((props->>'total_tokens')::int) FILTER (
    WHERE event_name = 'assistant.response' AND (props->>'total_tokens') IS NOT NULL
  ) AS total_tokens
FROM public.analytics_events
GROUP BY 1
ORDER BY 1 DESC;

COMMIT;