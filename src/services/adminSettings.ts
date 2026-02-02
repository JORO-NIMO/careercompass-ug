import { supabase } from '@/integrations/supabase/client';

export type AdminSettingKey = 'ai_token_daily_quota' | 'ai_token_alert_threshold';

export async function getAdminSetting<T = unknown>(key: AdminSettingKey): Promise<T | null> {
  const { data, error } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  if (error) throw error;
  return (data?.value?.value as T) ?? null;
}

export async function setAdminSetting<T = unknown>(key: AdminSettingKey, value: T): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  const payload = { key, value: { value }, updated_at: new Date().toISOString(), updated_by: user?.id ?? null };
  const { error } = await supabase
    .from('admin_settings')
    .upsert(payload, { onConflict: 'key' });
  if (error) throw error;
}
