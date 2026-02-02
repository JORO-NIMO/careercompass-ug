import { createSupabaseServiceClient } from '../../_shared/sbClient.ts';
import { verifyAuth, unauthorizedResponse, handleCors } from '../../_shared/auth.ts';
import { jsonError, jsonSuccess, withRateLimitHeaders, withRequestIdHeaders, jsonErrorWithId, withHeaders } from '../../_shared/responses.ts';
import {
  checkRateLimitUnified as checkRateLimit,
  getClientIdentifier,
  rateLimitExceededResponse,
  RATE_LIMITS,
} from '../../_shared/rateLimit.ts';
import { getRequestId } from '../../_shared/request.ts';

const ALLOWED_TARGET_ROLES = new Set(['user', 'employer', 'admin', 'all', null]);

export default async function (req: Request) {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const requestId = getRequestId(req);

  if (req.method !== 'POST') {
    return jsonErrorWithId('Method not allowed', 405, {}, {}, requestId);
  }

  const { user, error } = await verifyAuth(req);
  if (error || !user) {
    return jsonErrorWithId(error || 'Authentication required', 401, {}, {}, requestId);
  }

  const supabase = createSupabaseServiceClient();

  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle();

  if (roleError || !roleData) {
    return jsonErrorWithId('Admin role required', 403, {}, {}, requestId);
  }

  // Rate limit admin broadcast operations per user/IP
  const clientId = getClientIdentifier(req, user.id);
  const limit = await checkRateLimit(clientId, RATE_LIMITS.admin);
  if (!limit.allowed) {
    return rateLimitExceededResponse(limit.resetAt, requestId);
  }
  const rateHeaders = withRequestIdHeaders(
    withRateLimitHeaders({}, limit.remaining, limit.resetAt),
    requestId,
  );

  try {
    const payload = await req.json().catch(() => ({}));
    const title = typeof payload.title === 'string' ? payload.title.trim() : '';
    const message = typeof payload.message === 'string' ? payload.message.trim() : '';
    const targetRoleRaw = payload.target_role ?? null;
    const targetRole = typeof targetRoleRaw === 'string' ? targetRoleRaw.trim() : null;

    if (!title || !message) {
      return jsonErrorWithId('Title and message are required', 400, {}, rateHeaders, requestId);
    }

    if (!ALLOWED_TARGET_ROLES.has(targetRole)) {
      return jsonErrorWithId('Invalid target role', 400, {}, rateHeaders, requestId);
    }

    const normalizedRole = targetRole === 'all' ? null : targetRole;

    const { error: insertError } = await supabase.from('notifications').insert({
      title,
      message,
      body: message,
      type: 'admin_broadcast',
      target_role: normalizedRole,
      user_id: null,
      created_by: user.id,
    });

    if (insertError) {
      console.error('admin_notifications insert error', insertError);
      return jsonErrorWithId('Failed to create notification', 500, {}, rateHeaders, requestId);
    }

    return jsonSuccess({}, 200, rateHeaders);
  } catch (err) {
    console.error('admin_notifications handler error', err);
    return jsonErrorWithId('Internal server error', 500, {}, rateHeaders, requestId);
  }
}
