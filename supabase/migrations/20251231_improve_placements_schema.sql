-- Add deadline and application_link to placements table
ALTER TABLE public.placements
ADD COLUMN IF NOT EXISTS deadline timestamptz,
ADD COLUMN IF NOT EXISTS application_link text;

-- Add checking for valid URL format (optional but good practice)
ALTER TABLE public.placements
ADD CONSTRAINT proper_url
CHECK (
  application_link IS NULL
  OR application_link ~* '^https?://.+'
);
