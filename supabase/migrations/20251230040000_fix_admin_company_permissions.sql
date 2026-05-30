-- Fix Storage Permissions for Admins and Companies
BEGIN;

-- 1. Storage Policies
-- Note: storage.objects usually has RLS enabled by default.
-- We skip ALTER TABLE to avoid permission errors if not superuser.

-- Policy: Public Read Access for 'ads' and 'company-media'
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id IN ('ads', 'company-media') );

-- Policy: Authenticated Users can Upload to 'ads' and 'company-media'
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id IN ('ads', 'company-media') );

-- Policy: Users can Update/Delete their own files (or Admins can do anything)
DROP POLICY IF EXISTS "Owner/Admin Update Delete" ON storage.objects;
CREATE POLICY "Owner/Admin Update Delete"
ON storage.objects FOR UPDATE
TO authenticated
USING ( 
  (auth.uid() = owner) OR (is_admin()) 
)
WITH CHECK ( 
  (auth.uid() = owner) OR (is_admin()) 
);

DROP POLICY IF EXISTS "Owner/Admin Delete" ON storage.objects;
CREATE POLICY "Owner/Admin Delete"
ON storage.objects FOR DELETE
TO authenticated
USING ( 
  (auth.uid() = owner) OR (is_admin()) 
);


-- 2. Listings Permissions for Companies
-- Ensure companies can Create listings
DROP POLICY IF EXISTS "Companies can insert listings" ON public.listings;
CREATE POLICY "Companies can insert listings"
ON public.listings FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IN (SELECT owner_id FROM public.companies WHERE id = company_id)
  OR
  is_admin() -- Admins can also insert
);

-- Ensure companies can Update their own listings
DROP POLICY IF EXISTS "Companies can update own listings" ON public.listings;
CREATE POLICY "Companies can update own listings"
ON public.listings FOR UPDATE
TO authenticated
USING (
  auth.uid() IN (SELECT owner_id FROM public.companies WHERE id = company_id)
  OR
  is_admin()
)
WITH CHECK (
  auth.uid() IN (SELECT owner_id FROM public.companies WHERE id = company_id)
  OR
  is_admin()
);

-- 3. Posts Permissions for Admins (Re-enforcing)
-- Ensure admins can do everything on posts
DROP POLICY IF EXISTS "Admins have full control over posts" ON public.posts;
CREATE POLICY "Admins have full control over posts"
ON public.posts
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

COMMIT;
