// Proxy to send server-side events to PostHog (or store for later)
import { createSupabaseServiceClient } from '../../_shared/sbClient.ts';
import { verifyAuth, unauthorizedResponse, handleCors, corsHeaders } from '../../_shared/auth.ts';

export default async function (req: Request) {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ ok: false, message: 'Method not allowed' }), 
        { status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Require authentication for analytics ingestion
    const { user, error: authError } = await verifyAuth(req);
    if (authError || !user) {
      return unauthorizedResponse(authError || 'Authentication required');
    }

    const payload = await req.json().catch(() => ({ events: [] }));
    const supabase = createSupabaseServiceClient();

    // Store raw events in analytics_events for auditing
    // Ensure user_id matches authenticated user to prevent spoofing
    const events = Array.isArray(payload.events) ? payload.events : [payload];
    const rows = events.map((e: any) => ({
      user_id: user.id, // Always use authenticated user's ID
      session_id: e.session_id || null,
      event_name: e.event_name,
      props: e.props || {},
      timestamp: e.timestamp || new Date().toISOString(),
    }));
    
    await supabase.from('analytics_events').insert(rows).catch((e) => console.error('insert analytics error', e));

    // Forward to PostHog if configured
    const POSTHOG_API_KEY = Deno.env.get('POSTHOG_API_KEY');
    const POSTHOG_HOST = Deno.env.get('POSTHOG_HOST') || 'https://app.posthog.com';
    if (POSTHOG_API_KEY) {
      await fetch(`${POSTHOG_HOST}/capture/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${POSTHOG_API_KEY}` },
        body: JSON.stringify({ api_key: POSTHOG_API_KEY, events }),
      }).catch((e) => console.error('posthog forward error', e));
    }

    return new Response(
      JSON.stringify({ ok: true }), 
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (err) {
    console.error('analytics_proxy error', err);
    return new Response(
      JSON.stringify({ ok: false, error: 'Internal server error' }), 
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
}
