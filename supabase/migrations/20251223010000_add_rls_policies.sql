-- Migration: Add Row Level Security (RLS) policies
-- Ensures proper authorization for all database operations

-- Enable RLS on all tables
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Notifications policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;
CREATE POLICY "Service role can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Notification preferences policies
DROP POLICY IF EXISTS "Users can view their own preferences" ON public.notification_preferences;
CREATE POLICY "Users can view their own preferences"
  ON public.notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own preferences" ON public.notification_preferences;
CREATE POLICY "Users can update their own preferences"
  ON public.notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own preferences" ON public.notification_preferences;
CREATE POLICY "Users can insert their own preferences"
  ON public.notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Scheduled jobs policies (admin only)
DROP POLICY IF EXISTS "Only service role can access scheduled jobs" ON public.scheduled_jobs;
CREATE POLICY "Only service role can access scheduled jobs"
  ON public.scheduled_jobs FOR ALL
  USING (false)
  WITH CHECK (false);

-- Feedback policies
DROP POLICY IF EXISTS "Users can view their own feedback" ON public.feedback;
CREATE POLICY "Users can view their own feedback"
  ON public.feedback FOR SELECT
  USING (auth.uid() = user_id OR anonymous = true);

DROP POLICY IF EXISTS "Anyone can submit feedback" ON public.feedback;
CREATE POLICY "Anyone can submit feedback"
  ON public.feedback FOR INSERT
  WITH CHECK (true);

-- Analytics events policies (service role only for reads, anyone can track)
DROP POLICY IF EXISTS "Service role can view all analytics" ON public.analytics_events;
CREATE POLICY "Service role can view all analytics"
  ON public.analytics_events FOR SELECT
  USING (false);

DROP POLICY IF EXISTS "Anyone can insert analytics events" ON public.analytics_events;
CREATE POLICY "Anyone can insert analytics events"
  ON public.analytics_events FOR INSERT
  WITH CHECK (true);

-- Payments policies
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
CREATE POLICY "Users can view their own payments"
  ON public.payments FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can insert payments" ON public.payments;
CREATE POLICY "Service role can insert payments"
  ON public.payments FOR INSERT
  WITH CHECK (true);

-- Boosts policies
DROP POLICY IF EXISTS "Anyone can view active boosts" ON public.boosts;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'boosts'
      AND column_name = 'boost_until'
  ) THEN
    CREATE POLICY "Anyone can view active boosts"
      ON public.boosts FOR SELECT
      USING (boost_until > now());

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'boosts'
        AND column_name = 'poster_id'
    ) THEN
      DROP POLICY IF EXISTS "Users can view their own boosts" ON public.boosts;
      CREATE POLICY "Users can view their own boosts"
        ON public.boosts FOR SELECT
        USING (auth.uid() = poster_id);
    END IF;
  ELSE
    CREATE POLICY "Anyone can view active boosts"
      ON public.boosts FOR SELECT
      USING (is_active = true AND starts_at <= now() AND ends_at > now());
  END IF;
END $$;

DROP POLICY IF EXISTS "Service role can insert boosts" ON public.boosts;
CREATE POLICY "Service role can insert boosts"
  ON public.boosts FOR INSERT
  WITH CHECK (true);

-- Feature flags policies (read-only for everyone, admins can update via service role)
DROP POLICY IF EXISTS "Anyone can view feature flags" ON public.feature_flags;
CREATE POLICY "Anyone can view feature flags"
  ON public.feature_flags FOR SELECT
  USING (true);

-- Add admin check function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- Admin policies for managing data
DROP POLICY IF EXISTS "Admins can do everything on notifications" ON public.notifications;
CREATE POLICY "Admins can do everything on notifications"
  ON public.notifications FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can do everything on feedback" ON public.feedback;
CREATE POLICY "Admins can do everything on feedback"
  ON public.feedback FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
CREATE POLICY "Admins can view all payments"
  ON public.payments FOR SELECT
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can view all analytics" ON public.analytics_events;
CREATE POLICY "Admins can view all analytics"
  ON public.analytics_events FOR SELECT
  USING (is_admin());
