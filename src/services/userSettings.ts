import { supabase } from '@/integrations/supabase/client';
import { getAssistantPrefs, setAssistantPrefs, type AssistantPrefs } from '@/lib/assistantConfig';

export async function loadAssistantPrefsFromServer(): Promise<AssistantPrefs | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('user_settings')
    .select('assistant_prefs')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) {
    console.warn('loadAssistantPrefsFromServer error:', error.message);
    return null;
  }
  const prefs = (data?.assistant_prefs as AssistantPrefs | undefined) || null;
  if (prefs) setAssistantPrefs(prefs);
  return prefs;
}

export async function saveAssistantPrefsToServer(prefs: AssistantPrefs): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase
    .from('user_settings')
    .upsert({ user_id: user.id, assistant_prefs: prefs, updated_at: new Date().toISOString() });
  if (error) {
    console.warn('saveAssistantPrefsToServer error:', error.message);
  }
}
