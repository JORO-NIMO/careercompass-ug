import { createSupabaseServiceClient } from '../../_shared/sbClient.ts';
import { corsHeaders, handleCors } from '../../_shared/auth.ts';

const CRON_SECRET = Deno.env.get('BOOSTS_CRON_SECRET');

export default async function (req: Request) {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (CRON_SECRET) {
    const provided = req.headers.get('x-cron-secret');
    if (!provided || provided !== CRON_SECRET) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
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
      return new Response(
        JSON.stringify({ ok: false, error: 'Failed to deactivate boosts' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, deactivated: data?.length ?? 0 }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (err) {
    console.error('boosts maintenance handler failure', err);
    return new Response(
      JSON.stringify({ ok: false, error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
}
