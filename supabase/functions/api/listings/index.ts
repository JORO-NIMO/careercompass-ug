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
      .from('listings')
      .select('*, companies:companies(id, name, website_url)')
      .eq('status', 'published')
      .order('is_featured', { ascending: false })
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('public listings fetch error', error);
      return jsonError(`Failed to load listings: ${error.message}`, 500, error);
    }

    return jsonSuccess({ items: data ?? [] });
  } catch (err) {
    console.error('public listings handler error', err);
    return jsonError('Internal server error', 500);
  }
}
