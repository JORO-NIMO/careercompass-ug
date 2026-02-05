-- Migration: Opportunities Table with Vector Embeddings
-- For RSS-based opportunity ingestion with semantic search
-- Created: 2026-02-05

BEGIN;

-- Enable pgvector extension for embeddings (if not already enabled)
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- OPPORTUNITIES TABLE
-- Stores opportunities from RSS feeds with vector embeddings for semantic search
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  organization TEXT,
  description TEXT,
  url TEXT UNIQUE NOT NULL,
  source TEXT NOT NULL,
  type TEXT,           -- job, internship, scholarship, fellowship, training, grant
  field TEXT,          -- ICT/Technology, Engineering, Business, Health, etc.
  country TEXT,        -- Uganda, Kenya, Global, Remote, etc.
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  embedding VECTOR(1536)  -- OpenAI text-embedding-3-small dimensions
);

-- Indexes for filtering
CREATE INDEX IF NOT EXISTS idx_opportunities_type ON public.opportunities(type);
CREATE INDEX IF NOT EXISTS idx_opportunities_field ON public.opportunities(field);
CREATE INDEX IF NOT EXISTS idx_opportunities_country ON public.opportunities(country);
CREATE INDEX IF NOT EXISTS idx_opportunities_url ON public.opportunities(url);
CREATE INDEX IF NOT EXISTS idx_opportunities_created_at ON public.opportunities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_opportunities_published_at ON public.opportunities(published_at DESC);

-- Vector similarity index (IVF for approximate nearest neighbor)
CREATE INDEX IF NOT EXISTS idx_opportunities_embedding ON public.opportunities 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================================
-- RSS SOURCES TABLE
-- Manages RSS feed URLs for ingestion
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.rss_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_fetched_at TIMESTAMPTZ,
  last_error TEXT,
  items_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INGESTION LOGS TABLE
-- Tracks RSS feed processing for monitoring
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.opportunity_ingestion_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES public.rss_sources(id) ON DELETE SET NULL,
  source_url TEXT,
  status TEXT NOT NULL,  -- running, completed, failed
  items_fetched INT DEFAULT 0,
  items_inserted INT DEFAULT 0,
  items_skipped INT DEFAULT 0,
  items_failed INT DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ingestion_logs_status ON public.opportunity_ingestion_logs(status);
CREATE INDEX IF NOT EXISTS idx_ingestion_logs_started_at ON public.opportunity_ingestion_logs(started_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rss_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_ingestion_logs ENABLE ROW LEVEL SECURITY;

-- Public read access to opportunities
CREATE POLICY "Allow public read access to opportunities"
  ON public.opportunities
  FOR SELECT
  TO public
  USING (true);

-- Admin-only write access to opportunities
CREATE POLICY "Admin can manage opportunities"
  ON public.opportunities
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admin-only access to RSS sources
CREATE POLICY "Admin can manage RSS sources"
  ON public.rss_sources
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admin-only access to ingestion logs
CREATE POLICY "Admin can view ingestion logs"
  ON public.opportunity_ingestion_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Service role bypass for ingestion (handled via service key)

-- ============================================================================
-- INSERT INITIAL RSS SOURCES
-- ============================================================================

INSERT INTO public.rss_sources (name, url) VALUES
  ('Opportunities For Youth', 'https://opportunitiesforyouth.org/feed'),
  ('Opportunity Corners', 'https://opportunitiescorners.com/feed/'),
  ('Opportunity Desk', 'https://opportunitydesk.org/feed/'),
  ('Uganda MoE', 'https://www.education.go.ug/feed/'),
  ('Chevening', 'https://www.chevening.org/feed/'),
  ('Scholars4Dev', 'https://www.scholars4dev.com/feed/')
ON CONFLICT (url) DO NOTHING;

COMMIT;
