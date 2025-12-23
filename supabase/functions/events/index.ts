// Supabase Edge Function (Deno) - Events ingestion
// Accepts batched analytics events and persists them to analytics_events table
import { createSupabaseServiceClient } from '../_shared/sbClient.ts';

interface AnalyticsEvent {
  event_name: string;
  user_id?: string;
  session_id?: string;
  props?: Record<string, any>;
  timestamp?: string;
}

interface EventsPayload {
  events: AnalyticsEvent[];
}

export default async function (req: Request) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ ok: false, message: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const payload: EventsPayload = await req.json().catch(() => ({ events: [] }));
    
    // Validate payload structure
    if (!Array.isArray(payload.events)) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid payload: events must be an array' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Filter out invalid events and prepare for insertion
    const validEvents = payload.events
      .filter(e => e && typeof e.event_name === 'string' && e.event_name.length > 0)
      .map(e => ({
        event_name: e.event_name,
        user_id: e.user_id || null,
        session_id: e.session_id || null,
        props: e.props || {},
        timestamp: e.timestamp || new Date().toISOString(),
      }));

    if (validEvents.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: 'No valid events to insert' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Insert events into database
    const supabase = createSupabaseServiceClient();
    const { error } = await supabase
      .from('analytics_events')
      .insert(validEvents);

    if (error) {
      console.error('Failed to insert analytics events:', error);
      return new Response(
        JSON.stringify({ ok: false, error: 'Database insert failed' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, inserted: validEvents.length }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('events function error:', err);
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
