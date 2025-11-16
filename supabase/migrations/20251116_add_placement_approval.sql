-- Add approval and contact fields to placements
ALTER TABLE public.placements
ADD COLUMN approved boolean DEFAULT false,
ADD COLUMN contact_info text NULL;

-- Index for quick lookup of pending placements
CREATE INDEX IF NOT EXISTS idx_placements_approved ON public.placements (approved);
