import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

    async function fetchData() {
      try {
        // Count total notifications (sent) - use estimated for performance on large tables
        const { count: totalSent, error: sentError } = await supabase
          .from('notifications')
          .select('*', { count: 'estimated', head: true });
        if (sentError) throw sentError;

        // Count total reads (opened) - use estimated for performance on large tables
        const { count: totalOpened, error: readError } = await supabase
          .from('notification_reads')
          .select('*', { count: 'estimated', head: true });
        if (readError) throw readError;

        // Build date filter for last 30 days
        const now = new Date();
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const sinceDate = thirtyDaysAgo.toISOString();

        // Get notifications with created_at for time series (last 30 days)
        const { data: notifications, error: fetchError } = await supabase
          .from('notifications')
          .select('id, type, created_at')
          .gte('created_at', sinceDate)
          .order('created_at', { ascending: false });
        if (fetchError) throw fetchError;

        // Get notification IDs for filtering reads
        const notificationIds = (notifications ?? []).map(n => n.id);

        // Get reads for time series (filtered to fetched notifications, last 30 days)
        const { data: reads, error: readsError } = notificationIds.length === 0
          ? { data: [] as { notification_id: string; read_at: string | null }[], error: null }
          : await supabase
              .from('notification_reads')
              .select('notification_id, read_at')
              .in('notification_id', notificationIds)
              .gte('read_at', sinceDate)
              .order('read_at', { ascending: false });
        if (readsError) throw readsError;

        // Build time series (last 30 days)
        const now = new Date();
        const seriesMap = new Map<string, { sent: number; opened: number }>();
        for (let i = 29; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          seriesMap.set(d.toISOString().slice(0, 10), { sent: 0, opened: 0 });
        }

        for (const n of notifications ?? []) {
          if (!n.created_at) continue;
          const dateKey = n.created_at.slice(0, 10);
          const entry = seriesMap.get(dateKey);
          if (entry) entry.sent++;
        }

        for (const r of reads ?? []) {
          if (!r.read_at) continue;
          const dateKey = r.read_at.slice(0, 10);
          const entry = seriesMap.get(dateKey);
          if (entry) entry.opened++;
        }

        const eventsSeries = Array.from(seriesMap.entries()).map(([date, v]) => ({
          date,
          sent: v.sent,
          opened: v.opened,
          clicked: 0,
        }));

        // Build type breakdown
        const typeMap = new Map<string, { sent: number; opened: number }>();
        const readSet = new Set((reads ?? []).map(r => r.notification_id));
        for (const n of notifications ?? []) {
          const type = n.type || 'unknown';
          if (!typeMap.has(type)) typeMap.set(type, { sent: 0, opened: 0 });
          const entry = typeMap.get(type)!;
          entry.sent++;
          if (readSet.has(n.id)) entry.opened++;
        }

        const typeBreakdown = Array.from(typeMap.entries()).map(([type, v]) => ({
          type,
          sent: v.sent,
          opened: v.opened,
          clicked: 0,
        }));

        if (!cancelled) {
          setData({
            totalSent: totalSent ?? 0,
            totalOpened: totalOpened ?? 0,
            totalClicked: 0,
            eventsSeries,
            typeBreakdown,
          });
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to fetch notification analytics');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, []);

  return { data, loading, error };
}
