-- Migration: Advanced Opportunities Features
-- Adds application channels, deadlines, and tracking

-- 1. Update listings table with new application metadata
ALTER TABLE public.listings 
  ADD COLUMN IF NOT EXISTS opportunity_type text DEFAULT 'job',
  ADD COLUMN IF NOT EXISTS application_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS application_method text DEFAULT 'website', -- 'whatsapp', 'email', 'website', 'url'
  ADD COLUMN IF NOT EXISTS whatsapp_number text,
  ADD COLUMN IF NOT EXISTS application_email text,
  ADD COLUMN IF NOT EXISTS application_url text,
  ADD COLUMN IF NOT EXISTS region text;

-- 2. Create the applications_registry table to track student-opportunity links
CREATE TABLE IF NOT EXISTS public.applications_registry (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES public.listings(id) ON DELETE CASCADE,
  cv_snapshot_url text, -- Store the CV URL at the time of application
  status text DEFAULT 'pending', -- 'pending', 'reviewed', 'contacted', 'rejected'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, listing_id)
);

-- Enable RLS for applications_registry
ALTER TABLE public.applications_registry ENABLE ROW LEVEL SECURITY;

-- Recruiters can see applications for their own listings
CREATE POLICY "Recruiters can view applications for their listings" ON public.applications_registry
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.listings
      WHERE listings.id = applications_registry.listing_id
      AND listings.company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
      )
    )
  );

-- Students can see their own applications
CREATE POLICY "Students can view their own applications" ON public.applications_registry
  FOR SELECT
  USING (user_id = auth.uid());

-- Students can apply (insert)
CREATE POLICY "Students can apply to listings" ON public.applications_registry
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 3. Update profiles for improved education settings and CV
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cv_url text,
  ADD COLUMN IF NOT EXISTS school_name text,
  ADD COLUMN IF NOT EXISTS course_of_study text,
  ADD COLUMN IF NOT EXISTS year_of_study text,
  ADD COLUMN IF NOT EXISTS portfolio_url text;

-- 4. Automated Notifications Trigger
-- Note: This requires the net extension and properly configured vault secrets for the function URL
CREATE OR REPLACE FUNCTION public.on_listing_created_notify()
RETURNS TRIGGER AS $$
BEGIN
  -- We use the supabase_functions schema or http extension to call the edge function
  -- For now, we'll insert a record into a 'background_tasks' table or similar if it exists
  -- Or just log it. In a production environment, this would be a webhook or pg_net call.
  
  -- Example using pg_net (if available):
  -- PERFORM net.http_post(
  --   url := 'https://' || current_setting('request.headers')::json->>'host' || '/functions/v1/opportunity-notifications',
  --   body := json_build_object('listing_id', NEW.id)::text
  -- );

  -- Fallback: Create an in-app notification for all users matched by interest via SQL logic
  -- This is more reliable if pg_net is not configured.
  INSERT INTO public.notifications (user_id, type, title, body, metadata)
  SELECT 
    p.id, 
    'opportunity_match', 
    'New Match: ' || NEW.title,
    (SELECT name FROM public.companies WHERE id = NEW.company_id) || ' just posted a new role that matches your interests.',
    jsonb_build_object('listing_id', NEW.id)
  FROM public.profiles p
  WHERE p.areas_of_interest && ARRAY[NEW.opportunity_type, NEW.region] -- Simple match on type/region
     OR EXISTS (
       SELECT 1 FROM unnest(p.areas_of_interest) interest
       WHERE NEW.title ILIKE '%' || interest || '%'
     );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER tr_listing_created_notify
  AFTER INSERT ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.on_listing_created_notify();
