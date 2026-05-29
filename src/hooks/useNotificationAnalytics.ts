import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface NotificationAnalyticsData {
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  eventsSeries: Array<{ date: string; sent: number; opened: number; clicked: number }>;
  typeBreakdown: Array<{ type: string; sent: number; opened: number; clicked: number }>;
  smsDelivery?: Array<{ provider: string; status: string; day: string; total: number; successful: number; failed: number; pending: number }>;
  smsTotals?: { total: number; successful: number; failed: number; pending: number };
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
      .then(async (analyticsData) => {
        const { data: smsRows } = await supabase.rpc('get_sms_delivery_stats', { p_days: 30 });
        const smsDelivery = (smsRows || []) as NotificationAnalyticsData['smsDelivery'];
        const smsTotals = (smsDelivery || []).reduce(
          (acc, row) => ({
            total: acc.total + Number(row.total || 0),
            successful: acc.successful + Number(row.successful || 0),
            failed: acc.failed + Number(row.failed || 0),
            pending: acc.pending + Number(row.pending || 0),
          }),
          { total: 0, successful: 0, failed: 0, pending: 0 },
        );
        return { ...analyticsData, smsDelivery, smsTotals };
      })
      .then(setData)
      .catch(e => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  return { data, loading, error };
}
