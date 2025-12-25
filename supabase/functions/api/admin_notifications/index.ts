import { createSupabaseServiceClient } from '../../_shared/sbClient.ts';
import { verifyAuth, unauthorizedResponse, handleCors, corsHeaders } from '../../_shared/auth.ts';

const ALLOWED_TARGET_ROLES = new Set(['user', 'employer', 'admin', 'all', null]);

export default async function (req: Request) {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ ok: false, error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
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
    return new Response(
      JSON.stringify({ ok: false, error: 'Admin role required' }),
      { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  const payload = await req.json().catch(() => ({}));
  const title = typeof payload.title === 'string' ? payload.title.trim() : '';
  const message = typeof payload.message === 'string' ? payload.message.trim() : '';
  const targetRoleRaw = payload.target_role ?? null;
  const targetRole = typeof targetRoleRaw === 'string' ? targetRoleRaw.trim() : null;

  if (!title || !message) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Title and message are required' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  if (!ALLOWED_TARGET_ROLES.has(targetRole)) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Invalid target role' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
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
    return new Response(
      JSON.stringify({ ok: false, error: 'Failed to create notification' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  return new Response(
    JSON.stringify({ ok: true }),
    { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
  );
}
