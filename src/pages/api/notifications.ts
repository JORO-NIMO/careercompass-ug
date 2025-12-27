import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/integrations/supabase/client';
import { getUserFromRequest } from '@/lib/api-auth';

// GET: fetch notifications, POST: create notification, PATCH: mark as read
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const { type, message, channel, metadata } = req.body;
    const { data, error } = await supabase.from('notifications').insert({
      user_id: user.id,
      type,
      message,
      channel,
      metadata,
    });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  if (req.method === 'PATCH') {
    const { id } = req.body;
    const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id).eq('user_id', user.id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', ['GET', 'POST', 'PATCH']);
  res.status(405).end('Method Not Allowed');
}
