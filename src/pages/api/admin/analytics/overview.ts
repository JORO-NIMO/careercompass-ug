import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/integrations/supabase/client';
import { getUserFromRequest } from '@/lib/api-auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await getUserFromRequest(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Overview query
  const { data, error } = await supabase.rpc('admin_analytics_overview');
  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json(data);
}
