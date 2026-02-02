// Supabase Edge Function (Deno) - AI Usage Alerts
// Checks daily token usage against quota and inserts admin_alert notifications
import { createSupabaseServiceClient } from '../_shared/sbClient.ts';
import { jsonError, jsonSuccess } from '../_shared/responses.ts';

function getNumberEnv(key: string, defaultValue: number): number {
  const v = Deno.env.get(key);
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) ? n : defaultValue;
}

const handler = async (req: Request) => {
  // Allow GET for manual checks and POST for scheduled invocations
  if (req.method !== 'GET' && req.method !== 'POST') {
    return jsonError('Method not allowed', 405);
  }

  try {
    const supabase = createSupabaseServiceClient();

    // Fetch latest daily usage
    const { data: latest, error: usageError } = await supabase
      .from('ai_usage_daily')
      .select('*')
      .order('day', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (usageError) {
      console.error('Failed to query ai_usage_daily:', usageError);
      return jsonError('Failed to query usage', 500);
    }

    const tokensUsed = (latest?.total_tokens as number | null) ?? 0;
    // Load admin-configured settings (fallback to env/defaults)
    const { data: quotaRow } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'ai_token_daily_quota')
      .maybeSingle();
    const { data: threshRow } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'ai_token_alert_threshold')
      .maybeSingle();

    const quota = (quotaRow?.value?.value as number | undefined) ?? getNumberEnv('AI_TOKEN_DAILY_QUOTA', 100000);
    const threshold = (threshRow?.value?.value as number | undefined) ?? getNumberEnv('AI_TOKEN_ALERT_THRESHOLD', 0.9);
    const usedRatio = quota > 0 ? tokensUsed / quota : 0;

    const shouldAlert = usedRatio >= threshold;

    if (!shouldAlert) {
      return jsonSuccess({ alerted: false, tokensUsed, quota, usedRatio });
    }

    // Fetch admin users
    const { data: admins, error: adminError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (adminError) {
      console.error('Failed to fetch admins:', adminError);
      return jsonError('Failed to fetch admins', 500);
    }

    const nowIso = new Date().toISOString();
    const alerts = (admins || []).map((a) => ({
      user_id: a.user_id,
      type: 'admin_alert',
      title: 'AI token usage nearing quota',
      body: `Usage: ${(usedRatio * 100).toFixed(1)}% of daily quota (${tokensUsed}/${quota} tokens).`,
      channel: ['in_app', 'email'],
      metadata: { severity: 'warning', usedRatio, tokensUsed, quota },
      sent_at: nowIso,
      read: false,
    }));

    if (alerts.length === 0) {
      return jsonSuccess({ alerted: false, reason: 'No admins found' });
    }

    const { error: insertError } = await supabase
      .from('notifications')
      .insert(alerts);

    if (insertError) {
      console.error('Failed to insert notifications:', insertError);
      return jsonError('Failed to insert notifications', 500);
    }

    return jsonSuccess({ alerted: true, count: alerts.length, tokensUsed, quota, usedRatio });
  } catch (err) {
    console.error('ai-usage-alerts error:', err);
    return jsonError(err instanceof Error ? err.message : 'Internal server error', 500);
  }
};

Deno.serve(handler);