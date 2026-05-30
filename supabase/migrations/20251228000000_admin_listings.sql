-- Listings management for admin-controlled placements
BEGIN;

CREATE TABLE IF NOT EXISTS public.listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL,
  is_featured boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS listings_display_order_idx
  ON public.listings (display_order DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS listings_featured_idx
  ON public.listings (is_featured DESC, display_order DESC);

CREATE OR REPLACE FUNCTION public.handle_listings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS listings_set_updated_at ON public.listings;
CREATE TRIGGER listings_set_updated_at
BEFORE UPDATE ON public.listings
FOR EACH ROW
EXECUTE FUNCTION public.handle_listings_updated_at();

ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage listings" ON public.listings;
DROP POLICY IF EXISTS "Public view listings" ON public.listings;

CREATE POLICY "Public view listings"
  ON public.listings
  FOR SELECT
  USING (true);

CREATE POLICY "Admins manage listings"
  ON public.listings
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

COMMIT;
