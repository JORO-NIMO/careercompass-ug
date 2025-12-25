-- Create companies table with automatic approval flags
BEGIN;

CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  location_raw text,
  maps_place_id text,
  formatted_address text,
  website_url text,
  contact_email text,
  approved boolean NOT NULL DEFAULT false,
  maps_verified boolean NOT NULL DEFAULT false,
  web_verified boolean NOT NULL DEFAULT false,
  verification_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT companies_verified_consistency CHECK (
    approved = false OR (maps_verified = true AND web_verified = true)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS companies_created_by_key
  ON public.companies (created_by)
  WHERE created_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS companies_approved_idx
  ON public.companies (approved, updated_at DESC);

CREATE OR REPLACE FUNCTION public.handle_company_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS companies_set_updated_at ON public.companies;
CREATE TRIGGER companies_set_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.handle_company_updated_at();

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company owners can read" ON public.companies;
DROP POLICY IF EXISTS "Company owners can write" ON public.companies;
DROP POLICY IF EXISTS "Admins manage companies" ON public.companies;

CREATE POLICY "Company owners can read"
  ON public.companies
  FOR SELECT
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Company owners can write"
  ON public.companies
  FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (
    auth.uid() = created_by
    AND COALESCE(approved, false) = false
    AND COALESCE(maps_verified, false) = false
    AND COALESCE(web_verified, false) = false
  );

CREATE POLICY "Admins manage companies"
  ON public.companies
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

COMMIT;
