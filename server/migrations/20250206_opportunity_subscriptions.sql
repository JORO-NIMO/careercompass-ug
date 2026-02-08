-- Opportunity Subscriptions & Notifications Migration
-- Tables for user notification preferences and queued alerts

-- Opportunity Subscriptions table
CREATE TABLE IF NOT EXISTS opportunity_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  criteria JSONB NOT NULL DEFAULT '{}',
  channels TEXT[] NOT NULL DEFAULT ARRAY['in_app'],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_channels CHECK (
    channels <@ ARRAY['email', 'push', 'in_app']::TEXT[]
  )
);

-- Opportunity Notifications queue table
CREATE TABLE IF NOT EXISTS opportunity_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES opportunity_subscriptions(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_channel CHECK (channel IN ('email', 'push', 'in_app')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'sent', 'failed'))
);

-- Indexes for subscriptions
CREATE INDEX IF NOT EXISTS idx_opp_subscriptions_user 
  ON opportunity_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_opp_subscriptions_active 
  ON opportunity_subscriptions(is_active) WHERE is_active = true;

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_opp_notifications_user 
  ON opportunity_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_opp_notifications_status 
  ON opportunity_notifications(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_opp_notifications_subscription 
  ON opportunity_notifications(subscription_id);

-- Update timestamp trigger for subscriptions
CREATE OR REPLACE FUNCTION update_subscription_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_subscription_timestamp ON opportunity_subscriptions;
CREATE TRIGGER trigger_update_subscription_timestamp
  BEFORE UPDATE ON opportunity_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_timestamp();

-- RLS Policies
ALTER TABLE opportunity_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscriptions
CREATE POLICY subscription_select_own ON opportunity_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own subscriptions
CREATE POLICY subscription_insert_own ON opportunity_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own subscriptions
CREATE POLICY subscription_update_own ON opportunity_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own subscriptions
CREATE POLICY subscription_delete_own ON opportunity_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- Users can read their own notifications
CREATE POLICY notification_select_own ON opportunity_notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can manage all (for backend processing)
CREATE POLICY subscription_service_all ON opportunity_subscriptions
  FOR ALL TO service_role USING (true);

CREATE POLICY notification_service_all ON opportunity_notifications
  FOR ALL TO service_role USING (true);

-- Comment on tables
COMMENT ON TABLE opportunity_subscriptions IS 'User subscriptions for opportunity matching notifications';
COMMENT ON TABLE opportunity_notifications IS 'Queue for pending and sent opportunity notifications';
COMMENT ON COLUMN opportunity_subscriptions.criteria IS 'JSON object with types, fields, countries, keywords arrays';
COMMENT ON COLUMN opportunity_subscriptions.channels IS 'Array of notification channels: email, push, in_app';
