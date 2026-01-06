import { useEffect, useState } from 'react';
import type { AdminAnalyticsResponse } from '@/types/admin-analytics';

export function useAdminAnalytics() {
  const [data, setData] = useState<AdminAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch('/api/admin/analytics/overview', { credentials: 'include' })
      .then(r => {
        if (!r.ok) throw new Error('Failed to fetch analytics');
        return r.json();
      })
      .then(setData)
      .catch(e => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  return { data, loading, error };
}
