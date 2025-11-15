-- Migration: add notifications, preferences, scheduled_jobs, feedback, analytics_events, payments, boosts, feature_flags
-- Run this migration with your Supabase migration tooling

create extension if not exists pgcrypto;

-- notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  metadata jsonb DEFAULT '{}',
  channel text[] DEFAULT ARRAY['in_app'],
  scheduled_at timestamptz NULL,
  sent_at timestamptz NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- notification preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  preferences jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- scheduled jobs
CREATE TABLE IF NOT EXISTS public.scheduled_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type text,
  payload jsonb,
  run_at timestamptz,
  status text DEFAULT 'pending',
  attempts int DEFAULT 0,
  last_error text,
  created_at timestamptz DEFAULT now()
);

-- feedback
CREATE TABLE IF NOT EXISTS public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  session_id text NULL,
  rating int NULL,
  category text NULL,
  message text NOT NULL,
  anonymous boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- analytics events
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  session_id text NULL,
  event_name text NOT NULL,
  props jsonb DEFAULT '{}',
  timestamp timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_event_name_ts ON public.analytics_events(event_name, timestamp);

-- payments and boosts
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount_cents int NOT NULL,
  currency text NOT NULL,
  provider text NOT NULL,
  provider_charge_id text,
  status text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.boosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  poster_id uuid NOT NULL,
  boost_until timestamptz NOT NULL,
  multiplier float DEFAULT 1.0,
  created_at timestamptz DEFAULT now()
);

-- feature flags
CREATE TABLE IF NOT EXISTS public.feature_flags (
  key text PRIMARY KEY,
  enabled boolean DEFAULT false,
  config jsonb DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);
