-- Enhance companies ownership and uniqueness for user-initiated registration
BEGIN;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

UPDATE public.companies
SET owner_id = COALESCE(owner_id, created_by)
WHERE owner_id IS NULL;

ALTER TABLE public.companies
  ALTER COLUMN owner_id DROP DEFAULT,
  ALTER COLUMN owner_id SET NOT NULL;

DROP INDEX IF EXISTS companies_created_by_key;

DROP INDEX IF EXISTS companies_name_location_key;

CREATE UNIQUE INDEX IF NOT EXISTS companies_name_location_key
  ON public.companies (
    lower(name),
    coalesce(nullif(trim(formatted_address), ''), nullif(trim(location_raw), ''))
  )
  WHERE coalesce(nullif(trim(formatted_address), ''), nullif(trim(location_raw), '')) IS NOT NULL;

DROP POLICY IF EXISTS "Company owners can read" ON public.companies;
DROP POLICY IF EXISTS "Company owners can write" ON public.companies;

CREATE POLICY "Company owners can read"
  ON public.companies
  FOR SELECT
  USING (
    auth.uid() = owner_id
    OR auth.uid() = created_by
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Company owners can write"
  ON public.companies
  FOR UPDATE
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (
    (auth.uid() = owner_id AND approved = false AND maps_verified = false AND web_verified = false)
    OR public.has_role(auth.uid(), 'admin')
  );

COMMIT;
