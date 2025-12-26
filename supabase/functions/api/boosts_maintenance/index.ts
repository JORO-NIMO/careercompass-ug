import { createSupabaseServiceClient } from '../../_shared/sbClient.ts';
import { handleCors } from '../../_shared/auth.ts';
import { jsonError, jsonSuccess } from '../../_shared/responses.ts';

const CRON_SECRET = Deno.env.get('BOOSTS_CRON_SECRET');

export default async function (req: Request) {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (CRON_SECRET) {
    const provided = req.headers.get('x-cron-secret');
    if (!provided || provided !== CRON_SECRET) {
      return jsonError('Unauthorized', 401);
    }
  }

  try {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from('boosts')
      .update({ is_active: false })
      .lte('ends_at', new Date().toISOString())
      .eq('is_active', true)
      .select('id');

    if (error) {
      console.error('boosts maintenance error', error);
      return jsonError('Failed to deactivate boosts', 500);
    }

    return jsonSuccess({ deactivated: data?.length ?? 0 });
  } catch (err) {
    console.error('boosts maintenance handler failure', err);
    return jsonError('Internal server error', 500);
  }
}
