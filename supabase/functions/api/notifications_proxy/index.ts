import { createSupabaseServiceClient } from '../../_shared/sbClient.ts';
import { verifyAuth, unauthorizedResponse, handleCors } from '../../_shared/auth.ts';
import { jsonError, jsonSuccess, withRateLimitHeaders, withRequestIdHeaders, jsonErrorWithId } from '../../_shared/responses.ts';
import { getRequestId } from '../../_shared/request.ts';
import {
  checkRateLimitUnified as checkRateLimit,
  getClientIdentifier,
  rateLimitExceededResponse,
  RATE_LIMITS,
  rateLimitHeaders,
} from '../../_shared/rateLimit.ts';

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

    // Require authentication for sending notifications
    const { user, error: authError } = await verifyAuth(req);
    if (authError || !user) {
      return jsonErrorWithId(authError || 'Authentication required', 401, {}, {}, reqId);
    }

    // Rate limit per authenticated user/IP to prevent notification abuse
    const clientId = getClientIdentifier(req, user.id);
    const limit = await checkRateLimit(clientId, RATE_LIMITS.authenticated);
    if (!limit.allowed) {
      return rateLimitExceededResponse(limit.resetAt, reqId);
    }
    rlHeaders = withRequestIdHeaders(withRateLimitHeaders({}, limit.remaining, limit.resetAt), reqId);

    const payload = await req.json().catch(() => ({}));
    // payload: { user_id?, title, body, channels: ['in_app','email'], scheduled_at? }

    const supabase = createSupabaseServiceClient();

    // Ensure user can only send notifications for themselves or validate admin role
    const targetUserId = payload.user_id || user.id;
    
    // If targeting a different user, verify the sender has permission (admin check)
    if (targetUserId !== user.id) {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      
      if (!roleData) {
        return jsonErrorWithId('Cannot send notifications to other users', 403, {}, rlHeaders || withRequestIdHeaders({}, reqId), reqId);
      }
    }

    // Insert into notifications table for history
    await supabase.from('notifications').insert({
      user_id: targetUserId,
      type: payload.type || 'custom',
      title: payload.title,
      body: payload.body,
      channel: payload.channels || ['in_app'],
      metadata: payload.metadata || {},
      scheduled_at: payload.scheduled_at || null,
    });

    // Parallelize external sends with short timeouts to avoid long blocking
    const tasks: Promise<unknown>[] = [];

    if ((payload.channels || []).includes('email')) {
      const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
      if (BREVO_API_KEY && payload.email) {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 2000);
        tasks.push(
          fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'api-key': BREVO_API_KEY },
            body: JSON.stringify({ to: [{ email: payload.email }], subject: payload.title, htmlContent: payload.body }),
            signal: controller.signal,
          })
            .catch((e) => console.error('brevo send error', e))
            .finally(() => clearTimeout(t))
        );
      }
    }

    if ((payload.channels || []).includes('push') && targetUserId) {
      const ONESIGNAL_API_KEY = Deno.env.get('ONESIGNAL_API_KEY');
      const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID');
      if (ONESIGNAL_API_KEY && ONESIGNAL_APP_ID) {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 2000);
        tasks.push(
          fetch('https://onesignal.com/api/v1/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Basic ${ONESIGNAL_API_KEY}` },
            body: JSON.stringify({ app_id: ONESIGNAL_APP_ID, include_player_ids: [payload.player_id], headings: { en: payload.title }, contents: { en: payload.body } }),
            signal: controller.signal,
          })
            .catch((e) => console.error('onesignal error', e))
            .finally(() => clearTimeout(t))
        );
      }
    }

    if (tasks.length) {
      await Promise.allSettled(tasks);
    }

    return jsonSuccess({}, 200, rlHeaders || withRequestIdHeaders({}, reqId));
  } catch (err) {
    console.error('notifications_proxy error', err);
    return jsonErrorWithId('Internal server error', 500, {}, rlHeaders || withRequestIdHeaders({}, reqId), reqId);
  }
}
