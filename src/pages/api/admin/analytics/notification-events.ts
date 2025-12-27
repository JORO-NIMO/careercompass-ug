import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/integrations/supabase/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET
  if (req.method !== 'GET') return res.status(405).end();

  // Aggregate notification events for the last 30 days
  const { data: events, error } = await supabase.rpc('admin_notification_event_analytics', {});
  if (error) return res.status(500).json({ error: error.message });

  res.status(200).json(events);
}
