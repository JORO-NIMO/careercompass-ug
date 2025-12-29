// Supabase Edge Function (Deno) - Notifications
// Handles creating and scheduling notifications
import { createSupabaseServiceClient } from '../_shared/sbClient.ts';
import { verifyAuth, unauthorizedResponse, handleCors } from '../_shared/auth.ts';
import { jsonError, jsonSuccess } from '../_shared/responses.ts';

interface NotificationPayload {
  user_id?: string;
  type: string;
  title: string;
  body?: string;
  channel?: string[];
  scheduled_at?: string;
  metadata?: Record<string, unknown> | null;
}

const handler = async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const method = req.method.toUpperCase();

  if (method === 'POST') {
    try {
      // Require authentication
      const { user, error: authError } = await verifyAuth(req);
      if (authError || !user) {
        return unauthorizedResponse(authError || 'Authentication required');
      }

      const payload = (await req.json().catch(() => ({}))) as Partial<NotificationPayload>;

      // Validate required fields
      if (!payload.type || !payload.title) {
        return jsonError('Missing required fields: type and title', 400);
      }

      const supabase = createSupabaseServiceClient();

      // Ensure user can only create notifications for themselves unless admin
      const targetUserId = payload.user_id || user.id;

      if (targetUserId !== user.id) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (!roleData) {
          return jsonError('Cannot create notifications for other users', 403);
        }
      }

      // Determine if notification should be scheduled or sent immediately
      const isScheduled = payload.scheduled_at && new Date(payload.scheduled_at) > new Date();

      if (isScheduled) {
        // Create a scheduled job
        const { error: jobError } = await supabase
          .from('scheduled_jobs')
          .insert({
            job_type: 'send_notification',
            payload,
            run_at: payload.scheduled_at,
            status: 'pending',
          });

        if (jobError) {
          console.error('Failed to create scheduled job:', jobError);
          return jsonError('Failed to schedule notification', 500);
        }

        return jsonSuccess({ scheduled: true });
      } else {
        // Create notification immediately
        const metadata = typeof payload.metadata === 'object' && payload.metadata !== null ? payload.metadata : {};
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: targetUserId,
            type: payload.type,
            title: payload.title,
            body: payload.body || null,
            channel: payload.channel || ['in_app'],
            metadata,
            sent_at: new Date().toISOString(),
            read: false,
          });

        if (notifError) {
          console.error('Failed to create notification:', notifError);
          return jsonError('Failed to create notification', 500);
        }

        return jsonSuccess({ sent: true });
      }
    } catch (err) {
      console.error('notifications function error:', err);
      return jsonError(err instanceof Error ? err.message : 'Internal server error', 500);
    }
  }

  return jsonError('Method not allowed', 405);
};

Deno.serve(handler);
