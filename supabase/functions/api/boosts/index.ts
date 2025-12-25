import { createSupabaseServiceClient } from '../../_shared/sbClient.ts';
import { handleCors, corsHeaders } from '../../_shared/auth.ts';

export default async function (req: Request) {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ ok: false, error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
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
      return new Response(
        JSON.stringify({ ok: false, error: 'Failed to load boosts' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, items: data ?? [] }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (err) {
    console.error('boosts handler error', err);
    return new Response(
      JSON.stringify({ ok: false, error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
}
