/**
 * Analytics integration hook
 * Tracks page views and user interactions
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '@/lib/analytics';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

const getVisitorId = (): string => {
  const STORAGE_KEY = 'pb_visitor_id';
  let visitorId = localStorage.getItem(STORAGE_KEY);
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, visitorId);
  }
  return visitorId;
};

export function usePageTracking() {
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    const track = async () => {
      try {
        const visitorId = getVisitorId();
        // Call the atomic RPC function
        // @ts-ignore - Types for new schema not yet generated
        await supabase.rpc('track_visit', {
          p_visitor_id: visitorId,
          p_path: location.pathname,
          p_referrer: document.referrer || null,
          p_user_id: user?.id || null,
          p_user_agent: navigator.userAgent
        });
      } catch (error) {
        console.error('[Analytics] Failed to track visit:', error);
      }
    };

    // Track on mount and route change
    track();
  }, [location.pathname, user?.id]);
}
