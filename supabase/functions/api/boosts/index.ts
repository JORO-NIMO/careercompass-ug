import { createSupabaseServiceClient } from '../../_shared/sbClient.ts';
import { handleCors } from '../../_shared/auth.ts';
import { jsonError, jsonSuccess } from '../../_shared/responses.ts';

export default async function (req: Request) {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'GET') {
    return jsonError('Method not allowed', 405);
  }

  try {
    const supabase = createSupabaseServiceClient();
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from('boosts')
      .select('id, entity_id, entity_type, starts_at, ends_at')
      .eq('is_active', true)
      .lte('starts_at', nowIso)
      .gt('ends_at', nowIso)
      .order('ends_at', { ascending: false });

    if (error) {
      console.error('boosts fetch error', error);
      return jsonError('Failed to load boosts', 500);
    }

    return jsonSuccess({ items: data ?? [] });
  } catch (err) {
    console.error('boosts handler error', err);
    return jsonError('Internal server error', 500);
  }
}
