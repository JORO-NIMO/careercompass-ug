// Supabase Edge Function (Deno) - Events ingestion skeleton
// Accepts batched analytics events and persists them to analytics_events table

export default async function (req: Request) {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ ok: false, message: 'Method not allowed' }), { status: 405 });
    }

    const payload = await req.json().catch(() => ({ events: [] }));
    // Expected payload: { events: [{ event_name, user_id?, session_id?, props }] }
    // TODO: validate and write to analytics_events (via Supabase client on server)

    return new Response(JSON.stringify({ ok: true, received: payload }), { status: 200 });
  } catch (err) {
    console.error('events function error', err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500 });
  }
}
