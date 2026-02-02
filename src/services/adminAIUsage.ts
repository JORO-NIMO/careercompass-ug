import { supabase } from '@/integrations/supabase/client';

export interface AIUsageDailyRow {
  day: string; // ISO timestamp
  asks: number | null;
  responses: number | null;
  total_tokens: number | null;
}

export async function getAIUsageDaily(limit = 30): Promise<AIUsageDailyRow[]> {
  const { data, error } = await supabase
    .from('ai_usage_daily')
    .select('*')
    .order('day', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as AIUsageDailyRow[];
}

export async function getTodayUsage(): Promise<AIUsageDailyRow | null> {
  const { data, error } = await supabase
    .from('ai_usage_daily')
    .select('*')
    .order('day', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as AIUsageDailyRow) || null;
}