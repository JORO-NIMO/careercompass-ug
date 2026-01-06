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
    const { data, error } = await supabase
      .from('ads')
      .select('id, title, description, image_url, link, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('ads public fetch error', error);
      return jsonError('Failed to load ads', 500);
    }

    return jsonSuccess({ items: data ?? [] });
  } catch (err) {
    console.error('ads public handler error', err);
    return jsonError('Internal server error', 500);
  }
}
