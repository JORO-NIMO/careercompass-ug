// Supabase Edge Function (Deno) - Notifications
// Handles creating and scheduling notifications
import { createSupabaseServiceClient } from '../_shared/sbClient.ts';
import { verifyAuth, unauthorizedResponse, handleCors, corsHeaders } from '../_shared/auth.ts';

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

      const payload: NotificationPayload = await req.json().catch(() => ({}));

      // Validate required fields
      if (!payload.type || !payload.title) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Missing required fields: type and title' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
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
          return new Response(
            JSON.stringify({ ok: false, error: 'Cannot create notifications for other users' }),
            { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
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
            payload: payload,
            run_at: payload.scheduled_at,
            status: 'pending',
          });

        if (jobError) {
          console.error('Failed to create scheduled job:', jobError);
          return new Response(
            JSON.stringify({ ok: false, error: 'Failed to schedule notification' }),
            { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        return new Response(
          JSON.stringify({ ok: true, scheduled: true }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      } else {
        // Create notification immediately
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: targetUserId,
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
            { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        return new Response(
          JSON.stringify({ ok: true, sent: true }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
    } catch (err) {
      console.error('notifications function error:', err);
      return new Response(
        JSON.stringify({ ok: false, error: 'Internal server error' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
  }

  return new Response(
    JSON.stringify({ ok: false, message: 'Method not allowed' }),
    { status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
  );
}
