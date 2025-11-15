-- Migration: add external_cache table used for caching external API responses
create extension if not exists pgcrypto;

CREATE TABLE IF NOT EXISTS public.external_cache (
  key text PRIMARY KEY,
  response jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_external_cache_expires ON public.external_cache(expires_at);
