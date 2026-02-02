import { createSupabaseServiceClient } from '../../_shared/sbClient.ts';
import { verifyAuth, unauthorizedResponse, handleCors } from '../../_shared/auth.ts';
import { jsonError, jsonSuccess } from '../../_shared/responses.ts';

export default async function (req: Request) {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return jsonError('Method not allowed', 405);
  }

  try {
    const { user, error } = await verifyAuth(req);
    if (error || !user) {
      return unauthorizedResponse(error || 'Authentication required');
    }

    const payload = await req.json().catch(() => ({}));
    const notificationId = typeof payload.notification_id === 'string' ? payload.notification_id : '';

    if (!notificationId) {
      return jsonError('notification_id is required', 400);
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
      return jsonError('Failed to mark notification as read', 500);
    }

    return jsonSuccess({});
  } catch (err) {
    console.error('notifications_read handler error', err);
    return jsonError('Internal server error', 500);
  }
}
