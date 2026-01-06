-- Fix is_admin() function to correctly use user_roles table
-- Previous versions might have referenced profiles.role (which doesn't exist)
-- or relied on has_role helper that might be missing context.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'::app_role
  );
END;
$$;
