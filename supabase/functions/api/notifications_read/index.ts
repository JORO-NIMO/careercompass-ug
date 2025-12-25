import { createSupabaseServiceClient } from '../../_shared/sbClient.ts';
import { verifyAuth, unauthorizedResponse, handleCors, corsHeaders } from '../../_shared/auth.ts';

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

  const payload = await req.json().catch(() => ({}));
  const notificationId = typeof payload.notification_id === 'string' ? payload.notification_id : '';

  if (!notificationId) {
    return new Response(
      JSON.stringify({ ok: false, error: 'notification_id is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  const supabase = createSupabaseServiceClient();

  const { error: upsertError } = await supabase
    .from('notification_reads')
    .upsert(
      { notification_id: notificationId, user_id: user.id, read_at: new Date().toISOString() },
      { onConflict: 'notification_id,user_id' },
    );

  if (upsertError) {
    console.error('notification_reads upsert error', upsertError);
    return new Response(
      JSON.stringify({ ok: false, error: 'Failed to mark notification as read' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  return new Response(
    JSON.stringify({ ok: true }),
    { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
  );
}
