-- Add country and gender columns to profiles table

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS country text,
ADD COLUMN IF NOT EXISTS gender text;

-- Add comment to explain values if needed
COMMENT ON COLUMN public.profiles.gender IS 'User gender (Male, Female, Prefer not to say)';
