/**
 * Analytics integration hook
 * Tracks page views and user interactions
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '@/lib/analytics';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export function usePageTracking() {
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    // Track page view on route change
    trackPageView(
      location.pathname + location.search,
      document.title,
      user?.id
    );

    // [New] Real-time Page Visit Logging for Counter
    const logVisit = async () => {
      try {
        // @ts-ignore - Table created in new migration, types not yet generated
        await supabase.from('page_visits_log').insert({
          path: location.pathname,
          visited_at: new Date().toISOString()
        });
      } catch (e) {
        // silent fail
      }
    };
    logVisit();

  }, [location, user?.id]);
}
