// Proxy to send server-side events to PostHog (or store for later)
import { createSupabaseServiceClient } from '../../_shared/sbClient.ts';
import { verifyAuth, unauthorizedResponse, handleCors } from '../../_shared/auth.ts';
import { jsonError, jsonSuccess, withRateLimitHeaders, withRequestIdHeaders, jsonErrorWithId } from '../..//_shared/responses.ts';
import { getRequestId } from '../../_shared/request.ts';
import {
  checkRateLimitUnified as checkRateLimit,
  getClientIdentifier,
  rateLimitExceededResponse,
  RATE_LIMITS,
  rateLimitHeaders,
} from '../../_shared/rateLimit.ts';

interface AnalyticsEventPayload {
  session_id?: string | null;
  event_name?: string;
  props?: Record<string, unknown> | null;
  timestamp?: string;
}

function isEventPayload(value: unknown): value is AnalyticsEventPayload {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return 'event_name' in candidate && typeof candidate.event_name === 'string';
}

export default async function (req: Request) {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  let rlHeaders: HeadersInit | undefined;
  const reqId = getRequestId(req);
  try {
    if (req.method !== 'POST') {
      return jsonErrorWithId('Method not allowed', 405, {}, {}, reqId);
    }

    // Require authentication for analytics ingestion
    const { user, error: authError } = await verifyAuth(req);
    if (authError || !user) {
      return jsonErrorWithId(authError || 'Authentication required', 401, {}, {}, reqId);
    }

    // Apply basic rate limiting per authenticated user/IP
    const clientId = getClientIdentifier(req, user.id);
    const limit = await checkRateLimit(clientId, RATE_LIMITS.authenticated);
    if (!limit.allowed) {
      return rateLimitExceededResponse(limit.resetAt, reqId);
    }
    rlHeaders = withRequestIdHeaders(withRateLimitHeaders({}, limit.remaining, limit.resetAt), reqId);

    const payload = (await req.json().catch(() => ({ events: [] }))) as Record<string, unknown>;
    const supabase = createSupabaseServiceClient();

    // Store raw events in analytics_events for auditing
    // Ensure user_id matches authenticated user to prevent spoofing
    const rawEventsSource = (payload as { events?: unknown }).events;
    const rawEvents = Array.isArray(rawEventsSource)
      ? rawEventsSource
      : isEventPayload(payload)
        ? [payload]
        : [];
    const events = rawEvents.filter(isEventPayload);
    const rows = events.map((event) => ({
      user_id: user.id, // Always use authenticated user's ID
      session_id: event.session_id ?? null,
      event_name: event.event_name,
      props: event.props ?? {},
      timestamp: event.timestamp ?? new Date().toISOString(),
    }));
    
    const { error: insertError } = await supabase.from('analytics_events').insert(rows);
    if (insertError) console.error('insert analytics error', insertError);

    // Forward to PostHog if configured with a short timeout to avoid blocking
    const POSTHOG_API_KEY = Deno.env.get('POSTHOG_API_KEY');
    const POSTHOG_HOST = Deno.env.get('POSTHOG_HOST') || 'https://app.posthog.com';
    if (POSTHOG_API_KEY) {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 1000);
      try {
        await fetch(`${POSTHOG_HOST}/capture/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${POSTHOG_API_KEY}` },
          body: JSON.stringify({ api_key: POSTHOG_API_KEY, events }),
          signal: controller.signal,
        });
      } catch (e) {
        console.error('posthog forward error', e);
      } finally {
        clearTimeout(t);
      }
    }

    return jsonSuccess({}, 200, rlHeaders);
  } catch (err) {
    console.error('analytics_proxy error', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return jsonErrorWithId(message, 500, {}, rlHeaders || withRequestIdHeaders({}, reqId), reqId);
  }
}
