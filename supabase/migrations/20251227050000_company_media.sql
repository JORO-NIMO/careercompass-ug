-- Company media assets for images and PDFs (max 5MB)
BEGIN;

CREATE TABLE IF NOT EXISTS public.company_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  placement_id uuid REFERENCES public.placements(id) ON DELETE CASCADE,
  url text NOT NULL,
  path text NOT NULL,
  type text NOT NULL CHECK (type IN ('image', 'pdf')),
  size integer NOT NULL CHECK (size > 0 AND size <= 5242880),
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS company_media_company_id_idx
  ON public.company_media (company_id, uploaded_at DESC);

ALTER TABLE public.company_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view company media" ON public.company_media;
DROP POLICY IF EXISTS "Owners manage company media" ON public.company_media;
DROP POLICY IF EXISTS "Admins manage company media" ON public.company_media;

CREATE POLICY "Public can view company media"
  ON public.company_media
  FOR SELECT
  USING (true);

CREATE POLICY "Company owners can add media"
  ON public.company_media
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = company_media.company_id
        AND (c.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Company owners can delete media"
  ON public.company_media
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = company_media.company_id
        AND (c.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

COMMIT;
