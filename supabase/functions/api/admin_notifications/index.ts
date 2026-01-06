import { createSupabaseServiceClient } from '../../_shared/sbClient.ts';
import { verifyAuth, unauthorizedResponse, handleCors } from '../../_shared/auth.ts';
import { jsonError, jsonSuccess } from '../../_shared/responses.ts';

const ALLOWED_TARGET_ROLES = new Set(['user', 'employer', 'admin', 'all', null]);

export default async function (req: Request) {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return jsonError('Method not allowed', 405);
  }

  const { user, error } = await verifyAuth(req);
  if (error || !user) {
    return unauthorizedResponse(error || 'Authentication required');
  }

  const supabase = createSupabaseServiceClient();

  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle();

  if (roleError || !roleData) {
    return jsonError('Admin role required', 403);
  }

  const payload = await req.json().catch(() => ({}));
  const title = typeof payload.title === 'string' ? payload.title.trim() : '';
  const message = typeof payload.message === 'string' ? payload.message.trim() : '';
  const targetRoleRaw = payload.target_role ?? null;
  const targetRole = typeof targetRoleRaw === 'string' ? targetRoleRaw.trim() : null;

  if (!title || !message) {
    return jsonError('Title and message are required', 400);
  }

  if (!ALLOWED_TARGET_ROLES.has(targetRole)) {
    return jsonError('Invalid target role', 400);
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
    return jsonError('Failed to create notification', 500);
  }

  return jsonSuccess({});
}
