// Helper to extract user from request (example, adjust for your auth setup)
import type { NextApiRequest } from 'next';
import { supabase } from '@/integrations/supabase/client';

export async function getUserFromRequest(req: NextApiRequest) {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}
