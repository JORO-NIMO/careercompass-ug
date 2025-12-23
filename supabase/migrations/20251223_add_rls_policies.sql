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
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Notification preferences policies
CREATE POLICY "Users can view their own preferences"
  ON public.notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON public.notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON public.notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Scheduled jobs policies (admin only)
CREATE POLICY "Only service role can access scheduled jobs"
  ON public.scheduled_jobs FOR ALL
  USING (false)
  WITH CHECK (false);

-- Feedback policies
CREATE POLICY "Users can view their own feedback"
  ON public.feedback FOR SELECT
  USING (auth.uid() = user_id OR anonymous = true);

CREATE POLICY "Anyone can submit feedback"
  ON public.feedback FOR INSERT
  WITH CHECK (true);

-- Analytics events policies (service role only for reads, anyone can track)
CREATE POLICY "Service role can view all analytics"
  ON public.analytics_events FOR SELECT
  USING (false);

CREATE POLICY "Anyone can insert analytics events"
  ON public.analytics_events FOR INSERT
  WITH CHECK (true);

-- Payments policies
CREATE POLICY "Users can view their own payments"
  ON public.payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert payments"
  ON public.payments FOR INSERT
  WITH CHECK (true);

-- Boosts policies
CREATE POLICY "Anyone can view active boosts"
  ON public.boosts FOR SELECT
  USING (boost_until > now());

CREATE POLICY "Users can view their own boosts"
  ON public.boosts FOR SELECT
  USING (auth.uid() = poster_id);

CREATE POLICY "Service role can insert boosts"
  ON public.boosts FOR INSERT
  WITH CHECK (true);

-- Feature flags policies (read-only for everyone, admins can update via service role)
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
CREATE POLICY "Admins can do everything on notifications"
  ON public.notifications FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can do everything on feedback"
  ON public.feedback FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can view all payments"
  ON public.payments FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can view all analytics"
  ON public.analytics_events FOR SELECT
  USING (is_admin());
