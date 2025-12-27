import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/integrations/supabase/client';
import { getUserFromRequest } from '@/lib/api-auth';

// POST: register push subscription
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'POST') {
    const { endpoint, keys } = req.body;
    const { data, error } = await supabase.from('push_subscriptions').upsert({
      user_id: user.id,
      endpoint,
      keys,
    });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  res.setHeader('Allow', ['POST']);
  res.status(405).end('Method Not Allowed');
}
