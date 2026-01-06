import { useEffect, useState } from 'react';

export interface NotificationAnalyticsData {
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  eventsSeries: Array<{ date: string; sent: number; opened: number; clicked: number }>;
  typeBreakdown: Array<{ type: string; sent: number; opened: number; clicked: number }>;
}

export function useNotificationAnalytics() {
  const [data, setData] = useState<NotificationAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch('/api/admin/analytics/notification-events', { credentials: 'include' })
      .then(r => {
        if (!r.ok) throw new Error('Failed to fetch notification analytics');
        return r.json();
      })
      .then(setData)
      .catch(e => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  return { data, loading, error };
}
