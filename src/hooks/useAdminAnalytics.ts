import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AdminAnalyticsResponse } from '@/types/admin-analytics';

interface AnalyticsMetrics {
  unique_visitors: number;
  page_views: number;
  active_now: number;
  top_pages: { path: string; views: number }[];
}

export function useAdminAnalytics() {
  const [data, setData] = useState<AdminAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function fetchData() {
      try {
        const { data: metrics, error: rpcError } = await supabase.rpc<AnalyticsMetrics>('get_analytics_metrics');
        if (rpcError) throw rpcError;

        if (!cancelled) {
          setData({
            overview: {
              totalUsers: metrics?.unique_visitors ?? 0,
              totalEmployers: 0,
              newSignups: { daily: 0, weekly: 0, monthly: 0 },
              totalPlacements: 0,
              applications: 0,
              successfulPlacements: 0,
            },
            signupsSeries: [],
            placementsSeries: [],
            topCompanies: [],
          });
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to fetch analytics');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, []);

  return { data, loading, error };
}
