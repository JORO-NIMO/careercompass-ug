// Supabase Edge Function: sms-callbacks
// Handles Africa's Talking delivery reports and inbound STOP/UNSUBSCRIBE messages.

import { createSupabaseServiceClient } from '../_shared/sbClient.ts';
import { handleCors } from '../_shared/auth.ts';
import { jsonError, jsonSuccess } from '../_shared/responses.ts';

const STOP_WORDS = new Set(['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT']);
const HELP_WORDS = new Set(['HELP', 'INFO']);

type DeliveryPayload = {
  id?: string;
  status?: string;
  phoneNumber?: string;
  phone?: string;
  networkCode?: string;
  failureReason?: string;
};

type InboundPayload = {
  from?: string;
  text?: string;
  linkId?: string;
  id?: string;
  date?: string;
};

async function parsePayload(req: Request): Promise<Record<string, string>> {
  const contentType = req.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const body = await req.json();
    return Object.fromEntries(Object.entries(body || {}).map(([key, value]) => [key, String(value ?? '')]));
  }

  const raw = await req.text();
  return Object.fromEntries(new URLSearchParams(raw));
}

function normalizeStatus(status: string | undefined): 'sent' | 'delivered' | 'failed' | 'pending' {
  const value = (status || '').toLowerCase();
  if (['success', 'sent', 'submitted'].includes(value)) return 'sent';
  if (['delivered'].includes(value)) return 'delivered';
  if (['failed', 'rejected', 'undeliverable', 'expired'].includes(value)) return 'failed';
  return 'pending';
}

async function handleDelivery(payload: DeliveryPayload) {
  const supabase = createSupabaseServiceClient();
  const providerMessageId = payload.id;
  if (!providerMessageId) return jsonError('Missing delivery id', 400);

  const smsStatus = normalizeStatus(payload.status);
  const updatePayload: Record<string, string | null> = {
    sms_status: smsStatus,
    sms_error: smsStatus === 'failed' ? (payload.failureReason || payload.status || 'Delivery failed') : null,
  };
  if (['sent', 'delivered'].includes(smsStatus)) {
    updatePayload.sent_at = new Date().toISOString();
  }

  const { data: notification, error } = await supabase
    .from('notifications')
    .update(updatePayload)
    .eq('sms_provider', 'africastalking')
    .eq('sms_provider_message_id', providerMessageId)
    .select('id, user_id')
    .maybeSingle();

  if (error) return jsonError(`Failed to update delivery status: ${error.message}`, 500);

  if (notification) {
    await supabase.from('notification_events').insert({
      notification_id: notification.id,
      user_id: notification.user_id,
      event_type: smsStatus === 'failed' ? 'sms_failed_callback' : `sms_${smsStatus}`,
    });
  }

  return jsonSuccess({ processed: true, type: 'delivery', status: smsStatus, matched: Boolean(notification) });
}

async function handleInbound(payload: InboundPayload) {
  const supabase = createSupabaseServiceClient();
  const from = payload.from?.trim();
  const keyword = (payload.text || '').trim().split(/\s+/)[0]?.toUpperCase();

  if (!from || !keyword) return jsonError('Missing inbound from/text', 400);

  if (STOP_WORDS.has(keyword)) {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .update({ notification_sms: false })
      .eq('phone', from)
      .select('id');

    if (error) return jsonError(`Failed to unsubscribe phone: ${error.message}`, 500);

    const profileRows = (profiles || []) as Array<{ id: string }>;
    if (profileRows.length > 0) {
      await supabase.from('notification_events').insert(
        profileRows.map((profile) => ({
          user_id: profile.id,
          event_type: 'sms_unsubscribed',
        })),
      );
    }

    return jsonSuccess({ processed: true, type: 'inbound', action: 'unsubscribed', count: profileRows.length });
  }

  if (HELP_WORDS.has(keyword)) {
    return jsonSuccess({ processed: true, type: 'inbound', action: 'help' });
  }

  return jsonSuccess({ processed: true, type: 'inbound', action: 'ignored' });
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') return jsonError('Method not allowed', 405);

  try {
    const payload = await parsePayload(req);
    const callbackType = (new URL(req.url).searchParams.get('type') || payload.type || '').toLowerCase();

    if (callbackType === 'delivery' || payload.status) {
      return await handleDelivery(payload as DeliveryPayload);
    }

    return await handleInbound(payload as InboundPayload);
  } catch (err) {
    console.error('SMS callback error:', err);
    return jsonError(err instanceof Error ? err.message : 'Internal error', 500);
  }
});
