// Supabase Edge Function (Deno) - Events ingestion
// Accepts batched analytics events and persists them to analytics_events table
import { createSupabaseServiceClient } from '../_shared/sbClient.ts';
import { verifyAuth, unauthorizedResponse, handleCors, corsHeaders } from '../_shared/auth.ts';

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

// Maximum limits for input validation
const MAX_EVENTS = 100;
const MAX_EVENT_NAME_LENGTH = 100;
const MAX_PROPS_SIZE = 10000; // 10KB

export default async function (req: Request) {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ ok: false, message: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  try {
    // Require authentication for analytics ingestion
    const { user, error: authError } = await verifyAuth(req);
    if (authError || !user) {
      return unauthorizedResponse(authError || 'Authentication required');
    }

    const payload: EventsPayload = await req.json().catch(() => ({ events: [] }));
    
    // Validate payload structure
    if (!Array.isArray(payload.events)) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid payload: events must be an array' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Enforce maximum event count
    if (payload.events.length > MAX_EVENTS) {
      return new Response(
        JSON.stringify({ ok: false, error: `Maximum ${MAX_EVENTS} events allowed per request` }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Filter out invalid events and prepare for insertion
    // Always use authenticated user's ID to prevent spoofing
    const validEvents = payload.events
      .filter(e => 
        e && 
        typeof e.event_name === 'string' && 
        e.event_name.length > 0 &&
        e.event_name.length <= MAX_EVENT_NAME_LENGTH
      )
      .map(e => {
        // Validate props size
        const propsString = JSON.stringify(e.props || {});
        const props = propsString.length <= MAX_PROPS_SIZE ? (e.props || {}) : {};
        
        return {
          event_name: e.event_name.substring(0, MAX_EVENT_NAME_LENGTH),
          user_id: user.id, // Always use authenticated user's ID
          session_id: e.session_id || null,
          props,
          timestamp: e.timestamp || new Date().toISOString(),
        };
      });

    if (validEvents.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: 'No valid events to insert' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
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
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, inserted: validEvents.length }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (err) {
    console.error('events function error:', err);
    return new Response(
      JSON.stringify({ ok: false, error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
}
