-- Allow employer role to view candidate profiles after the enum value has been added.

DROP POLICY IF EXISTS "Employers can view candidate profiles" ON public.profiles;

CREATE POLICY "Employers can view candidate profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'employer'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );