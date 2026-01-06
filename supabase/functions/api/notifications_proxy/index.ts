import { createSupabaseServiceClient } from '../../_shared/sbClient.ts';
import { verifyAuth, unauthorizedResponse, handleCors } from '../../_shared/auth.ts';
import { jsonError, jsonSuccess } from '../../_shared/responses.ts';

export default async function (req: Request) {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    if (req.method !== 'POST') {
      return jsonError('Method not allowed', 405);
    }

    // Require authentication for sending notifications
    const { user, error: authError } = await verifyAuth(req);
    if (authError || !user) {
      return unauthorizedResponse(authError || 'Authentication required');
    }

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
        return jsonError('Cannot send notifications to other users', 403);
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

    // If email channel included, call Brevo (server-side)
    if ((payload.channels || []).includes('email')) {
      const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
      if (BREVO_API_KEY && payload.email) {
        await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'api-key': BREVO_API_KEY },
          body: JSON.stringify({ to: [{ email: payload.email }], subject: payload.title, htmlContent: payload.body }),
        }).catch((e) => console.error('brevo send error', e));
      }
    }

    // If push channel and user_id present, use OneSignal for web push
    if ((payload.channels || []).includes('push') && targetUserId) {
      const ONESIGNAL_API_KEY = Deno.env.get('ONESIGNAL_API_KEY');
      const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID');
      if (ONESIGNAL_API_KEY && ONESIGNAL_APP_ID) {
        await fetch('https://onesignal.com/api/v1/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Basic ${ONESIGNAL_API_KEY}` },
          body: JSON.stringify({ app_id: ONESIGNAL_APP_ID, include_player_ids: [payload.player_id], headings: { en: payload.title }, contents: { en: payload.body } }),
        }).catch((e) => console.error('onesignal error', e));
      }
    }

    return jsonSuccess({});
  } catch (err) {
    console.error('notifications_proxy error', err);
    return jsonError('Internal server error', 500);
  }
}
