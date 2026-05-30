-- Enable RLS and add policies for push_subscriptions and notification_events
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;

-- Push subscriptions policies
CREATE POLICY "Users can view their own push subscriptions"
  ON public.push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own push subscriptions"
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push subscriptions"
  ON public.push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- Notification events policies
CREATE POLICY "Users can view their own notification events"
  ON public.notification_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert notification events"
  ON public.notification_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can do everything on push_subscriptions"
  ON public.push_subscriptions FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can do everything on notification_events"
  ON public.notification_events FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
