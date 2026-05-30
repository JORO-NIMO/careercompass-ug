BEGIN;

ALTER TABLE public.placements
  ALTER COLUMN approved SET DEFAULT true;

UPDATE public.placements
SET approved = true
WHERE approved IS NOT TRUE;

ALTER TABLE public.placements
  ADD COLUMN flagged boolean NOT NULL DEFAULT false,
  ADD COLUMN flag_reason text,
  ADD COLUMN flagged_at timestamptz,
  ADD COLUMN flagged_by uuid REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_placements_flagged
  ON public.placements (flagged);

COMMIT;
