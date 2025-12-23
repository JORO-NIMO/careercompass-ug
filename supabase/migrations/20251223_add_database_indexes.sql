-- Migration: Add comprehensive database indexes for performance optimization
-- Indexes improve query performance for common access patterns

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_sent_at ON public.notifications(sent_at);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_at ON public.notifications(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, read, created_at DESC) WHERE read = false;

-- Notification preferences indexes
CREATE INDEX IF NOT EXISTS idx_notification_prefs_user_id ON public.notification_preferences(user_id);

-- Scheduled jobs indexes
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_status ON public.scheduled_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_run_at ON public.scheduled_jobs(run_at, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_type ON public.scheduled_jobs(job_type);

-- Feedback indexes
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON public.feedback(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_feedback_category ON public.feedback(category);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_rating ON public.feedback(rating) WHERE rating IS NOT NULL;

-- Analytics events indexes (critical for performance)
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON public.analytics_events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_session_id ON public.analytics_events(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON public.analytics_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_event_timestamp ON public.analytics_events(event_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_user_event ON public.analytics_events(user_id, event_name, timestamp DESC);

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_provider ON public.payments(provider);
CREATE INDEX IF NOT EXISTS idx_payments_provider_charge_id ON public.payments(provider_charge_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);

-- Boosts indexes
CREATE INDEX IF NOT EXISTS idx_boosts_post_id ON public.boosts(post_id);
CREATE INDEX IF NOT EXISTS idx_boosts_poster_id ON public.boosts(poster_id);
CREATE INDEX IF NOT EXISTS idx_boosts_boost_until ON public.boosts(boost_until);
CREATE INDEX IF NOT EXISTS idx_boosts_active ON public.boosts(post_id, boost_until) WHERE boost_until > now();

-- Feature flags indexes
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON public.feature_flags(enabled) WHERE enabled = true;

-- Placements indexes (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'placements') THEN
    CREATE INDEX IF NOT EXISTS idx_placements_approved ON public.placements(approved) WHERE approved = true;
    CREATE INDEX IF NOT EXISTS idx_placements_region ON public.placements(region);
    CREATE INDEX IF NOT EXISTS idx_placements_industry ON public.placements(industry);
    CREATE INDEX IF NOT EXISTS idx_placements_created_by ON public.placements(created_by);
    CREATE INDEX IF NOT EXISTS idx_placements_created_at ON public.placements(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_placements_search ON public.placements(approved, created_at DESC) WHERE approved = true;
  END IF;
END $$;

-- Profiles indexes (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
    CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
  END IF;
END $$;

-- Add GIN index for JSONB columns for faster queries on metadata/props
CREATE INDEX IF NOT EXISTS idx_notifications_metadata_gin ON public.notifications USING gin(metadata);
CREATE INDEX IF NOT EXISTS idx_analytics_props_gin ON public.analytics_events USING gin(props);
CREATE INDEX IF NOT EXISTS idx_payments_metadata_gin ON public.payments USING gin(metadata);

-- Add comment explaining indexes
COMMENT ON INDEX idx_analytics_event_timestamp IS 'Optimizes queries filtering by event_name and ordering by timestamp';
COMMENT ON INDEX idx_boosts_active IS 'Partial index for active boosts only, reduces index size';
COMMENT ON INDEX idx_notifications_user_unread IS 'Composite index for fetching unread notifications per user';
