-- Migration: Smart Job Matching (Vector Search)
-- Enables 'vector' extension and adds embedding columns

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;

-- 2. Add embedding column to Listings
-- We use 1536 dimensions (standard for OpenAI text-embedding-3-small)
ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- 3. Add embedding column to Profiles (for "Match Me" feature)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- 4. Create Indexes for faster search (IVFFlat or HNSW)
-- HNSW is generally faster for recall but takes more build time. Good for <1M rows.
CREATE INDEX IF NOT EXISTS listings_embedding_idx 
ON public.listings 
USING hnsw (embedding vector_cosine_ops);

-- 5. RPC: Match Listings
-- Returns listings sorted by cosine similarity to the query_embedding
CREATE OR REPLACE FUNCTION public.match_listings(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  similarity float
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    listings.id,
    listings.title,
    listings.description,
    1 - (listings.embedding <=> query_embedding) as similarity
  FROM public.listings
  WHERE 1 - (listings.embedding <=> query_embedding) > match_threshold
  ORDER BY listings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
