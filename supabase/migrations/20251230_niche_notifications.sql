-- Migration: Add Industry to Listings & Enhance Notifications
-- Date: 2025-12-30

-- 1. Add industry column to listings if it doesn't exist
ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS industry text;

-- 2. Update the Notification Trigger Function
CREATE OR REPLACE FUNCTION public.on_listing_created_notify()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into notifications table
  -- We match users based on their 'areas_of_interest' array in 'profiles' table
  -- matching against the listing's 'industry', 'region', 'opportunity_type'
  
  INSERT INTO public.notifications (user_id, type, title, body, metadata)
  SELECT 
    p.id, 
    'opportunity_match', 
    'New ' || NEW.opportunity_type || ' in ' || COALESCE(NEW.industry, 'your niche'),
    'A new ' || NEW.opportunity_type || ' at ' || (SELECT name FROM public.companies WHERE id = NEW.company_id) || ' matches your interest in ' || COALESCE(NEW.industry, 'this field') || '.',
    jsonb_build_object('listing_id', NEW.id, 'industry', NEW.industry)
  FROM public.profiles p
  WHERE 
    -- Match if the listing's industry is in the user's areas of interest
    (NEW.industry IS NOT NULL AND EXISTS (
       SELECT 1 FROM unnest(p.areas_of_interest) interest
       WHERE interest ILIKE NEW.industry
    ))
    OR 
    -- Match if the listing's opportunity_type is in the user's areas of interest
    (NEW.opportunity_type IS NOT NULL AND EXISTS (
       SELECT 1 FROM unnest(p.areas_of_interest) interest
       WHERE interest ILIKE NEW.opportunity_type
    ))
    OR
    -- Partial text match on title
    EXISTS (
       SELECT 1 FROM unnest(p.areas_of_interest) interest
       WHERE NEW.title ILIKE '%' || interest || '%'
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Ensure the trigger is active
DROP TRIGGER IF EXISTS tr_listing_created_notify ON public.listings;

CREATE TRIGGER tr_listing_created_notify
  AFTER INSERT ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.on_listing_created_notify();
