-- Global Platform Transformation Schema Updates

-- 1. Updates to companies table
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS registration_number text,
ADD COLUMN IF NOT EXISTS country text DEFAULT 'Uganda', -- Default for existing
ADD COLUMN IF NOT EXISTS business_name text;

-- Update business_name to match name if null (for existing records)
UPDATE public.companies 
SET business_name = name 
WHERE business_name IS NULL;

-- 2. Updates to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS nationality text,
ADD COLUMN IF NOT EXISTS passport_or_nin text,
ADD COLUMN IF NOT EXISTS education_history jsonb DEFAULT '[]'::jsonb;

-- Comment on columns for clarity
COMMENT ON COLUMN public.companies.registration_number IS 'Legal business registration number';
COMMENT ON COLUMN public.companies.business_name IS 'Official registered business name';
COMMENT ON COLUMN public.profiles.passport_or_nin IS 'Passport Number or National ID Number';
COMMENT ON COLUMN public.profiles.education_history IS 'Array of {institution, qualification, start_year, end_year}';
