-- Allow authenticated employers to manage their placements while keeping admin access.

DROP POLICY IF EXISTS "Admins can insert placements" ON public.placements;
DROP POLICY IF EXISTS "Admins can update placements" ON public.placements;
DROP POLICY IF EXISTS "Admins can delete placements" ON public.placements;
DROP POLICY IF EXISTS "Admins can manage placements" ON public.placements;

CREATE POLICY "Owners can insert placements"
  ON public.placements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Owners can update placements"
  ON public.placements
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    auth.uid() = created_by
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Owners can delete placements"
  ON public.placements
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = created_by
    OR public.has_role(auth.uid(), 'admin')
  );

-- Dedicated admin override policy
CREATE POLICY "Admins can manage placements"
  ON public.placements
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
