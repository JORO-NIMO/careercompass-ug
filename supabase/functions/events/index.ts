// Supabase Edge Function (Deno) - Events ingestion
// Accepts batched analytics events and persists them to analytics_events table
import { createSupabaseServiceClient } from '../_shared/sbClient.ts';
import { verifyAuth, unauthorizedResponse, handleCors } from '../_shared/auth.ts';
import { jsonError, jsonSuccess } from '../_shared/responses.ts';

interface AnalyticsEvent {
  event_name: string;
  session_id?: string | null;
  props?: Record<string, unknown> | null;
  timestamp?: string;
}

interface EventsPayload {
  events?: unknown;
}

function isAnalyticsEvent(value: unknown): value is AnalyticsEvent {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  if (typeof candidate.event_name !== 'string') {
    return false;
  }

  if (candidate.session_id !== undefined && typeof candidate.session_id !== 'string') {
    return false;
  }

  if (candidate.timestamp !== undefined && typeof candidate.timestamp !== 'string') {
    return false;
  }

  if (candidate.props !== undefined && (typeof candidate.props !== 'object' || candidate.props === null)) {
    return false;
  }

  return true;
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
    return jsonError('Method not allowed', 405);
  }

  try {
    // Require authentication for analytics ingestion
    const { user, error: authError } = await verifyAuth(req);
    if (authError || !user) {
      return unauthorizedResponse(authError || 'Authentication required');
    }

    const payload = (await req.json().catch(() => ({ events: [] }))) as EventsPayload;

    // Validate payload structure
    if (!Array.isArray(payload.events)) {
      return jsonError('Invalid payload: events must be an array', 400);
    }

    // Enforce maximum event count
    if (payload.events.length > MAX_EVENTS) {
      return jsonError(`Maximum ${MAX_EVENTS} events allowed per request`, 400);
    }

    // Filter out invalid events and prepare for insertion
    // Always use authenticated user's ID to prevent spoofing
    const validEvents = (payload.events as unknown[])
      .filter(isAnalyticsEvent)
      .filter((event) => event.event_name.length > 0 && event.event_name.length <= MAX_EVENT_NAME_LENGTH)
      .map((event) => {
        const propsCandidate = event.props ?? {};
        const normalizedProps = typeof propsCandidate === 'object' && propsCandidate !== null ? propsCandidate : {};
        const propsString = JSON.stringify(normalizedProps);
        const props = propsString.length <= MAX_PROPS_SIZE ? normalizedProps : {};

        return {
          event_name: event.event_name.substring(0, MAX_EVENT_NAME_LENGTH),
          user_id: user.id, // Always use authenticated user's ID
          session_id: event.session_id ?? null,
          props,
          timestamp: event.timestamp ?? new Date().toISOString(),
        };
      });

    if (validEvents.length === 0) {
      return jsonError('No valid events to insert', 400);
    }

    // Insert events into database
    const supabase = createSupabaseServiceClient();
    const { error } = await supabase
      .from('analytics_events')
      .insert(validEvents);

    if (error) {
      console.error('Failed to insert analytics events:', error);
      return jsonError('Database insert failed', 500);
    }

    return jsonSuccess({ inserted: validEvents.length });
  } catch (err) {
    console.error('events function error:', err);
    return jsonError(err instanceof Error ? err.message : 'Internal server error', 500);
  }
}
