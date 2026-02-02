import { supabase } from '@/integrations/supabase/client';

export interface UserIp {
  id: number;
  user_id: string | null;
  ip: string;
  user_agent: string | null;
  first_seen: string;
  last_seen: string;
  flagged: boolean;
  flagged_reason: string | null;
  flagged_at: string | null;
  flagged_by: string | null;
}

export async function listUserIPs(limit = 200): Promise<UserIp[]> {
  const { data, error } = await supabase
    .from('user_ip_addresses')
    .select('*')
    .order('last_seen', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as UserIp[];
}

export async function flagIP(id: number, reason?: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('user_ip_addresses')
    .update({ flagged: true, flagged_reason: reason ?? null, flagged_at: new Date().toISOString(), flagged_by: user?.id ?? null })
    .eq('id', id);
  if (error) throw error;
}

export async function unflagIP(id: number): Promise<void> {
  const { error } = await supabase
    .from('user_ip_addresses')
    .update({ flagged: false, flagged_reason: null, flagged_at: null, flagged_by: null })
    .eq('id', id);
  if (error) throw error;
}
