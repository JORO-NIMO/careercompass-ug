-- Fix 500 errors caused by RLS recursion on user_roles
-- Error seen by clients: 42P17 infinite recursion detected in policy for relation "user_roles"

-- Ensure helper runs without RLS recursion when reading user_roles.
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Remove recursive policy that queried user_roles through has_role() from user_roles itself.
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

-- Keep self-read policy for authenticated users.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_roles'
      AND policyname = 'Users can view their own roles'
  ) THEN
    CREATE POLICY "Users can view their own roles"
      ON public.user_roles
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END
$$;

-- Published content retention: allow deleting listings only after 3 months from publication.
-- Admins can still delete at any time.
DROP POLICY IF EXISTS "Listing owner can delete after retention" ON public.listings;
CREATE POLICY "Listing owner can delete after retention"
  ON public.listings
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    AND (
      published_at IS NULL
      OR published_at <= now() - interval '3 months'
    )
  );
