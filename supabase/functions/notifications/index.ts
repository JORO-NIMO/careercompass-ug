// Supabase Edge Function (Deno) - Notifications
// Handles creating and scheduling notifications
import { createSupabaseServiceClient } from '../_shared/sbClient.ts';

interface NotificationPayload {
  user_id?: string;
  type: string;
  title: string;
  body?: string;
  channel?: string[];
  scheduled_at?: string;
  metadata?: Record<string, any>;
}

export default async function (req: Request) {
  const method = req.method.toUpperCase();

  if (method === 'POST') {
    try {
      const payload: NotificationPayload = await req.json().catch(() => ({}));

      // Validate required fields
      if (!payload.type || !payload.title) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Missing required fields: type and title' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const supabase = createSupabaseServiceClient();

      // Determine if notification should be scheduled or sent immediately
      const isScheduled = payload.scheduled_at && new Date(payload.scheduled_at) > new Date();

      if (isScheduled) {
        // Create a scheduled job
        const { error: jobError } = await supabase
          .from('scheduled_jobs')
          .insert({
            job_type: 'send_notification',
            payload: payload,
            run_at: payload.scheduled_at,
            status: 'pending',
          });

        if (jobError) {
          console.error('Failed to create scheduled job:', jobError);
          return new Response(
            JSON.stringify({ ok: false, error: 'Failed to schedule notification' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ ok: true, scheduled: true }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      } else {
        // Create notification immediately
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: payload.user_id || null,
            type: payload.type,
            title: payload.title,
            body: payload.body || null,
            channel: payload.channel || ['in_app'],
            metadata: payload.metadata || {},
            sent_at: new Date().toISOString(),
            read: false,
          });

        if (notifError) {
          console.error('Failed to create notification:', notifError);
          return new Response(
            JSON.stringify({ ok: false, error: 'Failed to create notification' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          );
        }

        // TODO: Send email if channel includes 'email'
        // TODO: Send push notification if channel includes 'push'

        return new Response(
          JSON.stringify({ ok: true, sent: true }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } catch (err) {
      console.error('notifications function error:', err);
      return new Response(
        JSON.stringify({ ok: false, error: String(err) }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  return new Response(
    JSON.stringify({ ok: false, message: 'Method not allowed' }),
    { status: 405, headers: { 'Content-Type': 'application/json' } }
  );
}
