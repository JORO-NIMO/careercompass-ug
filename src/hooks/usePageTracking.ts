/**
 * Analytics integration hook
 * Tracks page views and user interactions
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '@/lib/analytics';
import { useAuth } from './useAuth';

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
  }, [location, user?.id]);
}
