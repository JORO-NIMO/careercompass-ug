// Deno Edge Function: match-notify
// Matches users to recent feed + placement opportunities and sends notifications

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOCK_DURATION_MINUTES = 20;
const LOOKBACK_HOURS = 6;

interface JobAlert {
  id: string;
  user_id: string;
  criteria?: {
    keywords?: string[];
    regions?: string[];
    industries?: string[];
  };
  channels: string[];
  last_notified_at: string | null;
}

interface MatchRow {
  placement_id: string;
  position_title: string;
  company_name: string;
  region: string | null;
  industry: string | null;
  match_score: number;
  match_reasons: string[];
  source_table?: string;
}

interface SmsDeliveryResult {
  delivered: boolean;
  provider: 'africastalking';
  providerMessageId?: string;
  reason?: string;
}

async function resolveSmsPhone(supabase: ReturnType<typeof createClient>, userId: string): Promise<string | null> {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('phone, notification_sms')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) throw new Error(`profile phone lookup failed: ${profileError.message}`);

  const profileRecord = profile as { phone?: string | null; notification_sms?: boolean | null } | null;
  if (!profileRecord?.notification_sms) return null;

  const profilePhone = profileRecord.phone?.trim();
  if (profilePhone) return profilePhone;

  const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
  if (userError) throw new Error(`auth user lookup failed: ${userError.message}`);

  return userData.user?.phone?.trim() || null;
}

async function sendSmsNotification(params: {
  supabase: ReturnType<typeof createClient>;
  userId: string;
  message: string;
  matches: MatchRow[];
}): Promise<SmsDeliveryResult> {
  const { supabase, userId, message, matches } = params;
  const provider: SmsDeliveryResult['provider'] = 'africastalking';
  const username = Deno.env.get('AFRICASTALKING_USERNAME');
  const apiKey = Deno.env.get('AFRICASTALKING_API_KEY');
  const senderId = Deno.env.get('AFRICASTALKING_SENDER_ID');
  const apiUrl = Deno.env.get('AFRICASTALKING_SMS_URL') || 'https://api.africastalking.com/version1/messaging';

  if (!username || !apiKey) {
    return { delivered: false, provider, reason: 'Africa\'s Talking credentials are not configured' };
  }

  let phone: string | null = null;
  try {
    phone = await resolveSmsPhone(supabase, userId);
  } catch (err) {
    return { delivered: false, provider, reason: (err as Error).message };
  }

  if (!phone) {
    return { delivered: false, provider, reason: 'SMS opt-in or saved phone number is missing' };
  }

  const body = new URLSearchParams({
    username,
    to: phone,
    message,
    bulkSMSMode: '1',
  });
  if (senderId) body.set('from', senderId);

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      apiKey,
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const responseText = await response.text();
  let payload: Record<string, unknown> | null = null;
  try {
    payload = responseText ? JSON.parse(responseText) as Record<string, unknown> : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    return { delivered: false, provider, reason: `Africa's Talking failed: ${response.status} ${responseText}` };
  }

  const recipients = ((payload?.SMSMessageData as Record<string, unknown> | undefined)?.Recipients as Array<Record<string, unknown>> | undefined) || [];
  const firstRecipient = recipients[0];
  const status = String(firstRecipient?.status || '').toLowerCase();
  const providerMessageId = firstRecipient?.messageId ? String(firstRecipient.messageId) : undefined;
  const delivered = status === 'success' || status === 'sent' || status === 'submitted';

  return {
    delivered,
    provider,
    providerMessageId,
    reason: delivered ? undefined : (firstRecipient?.status ? String(firstRecipient.status) : `Unexpected Africa's Talking response for ${matches.length} matches`),
  };
}

function includesAny(haystack: string, needles?: string[]): boolean {
  if (!needles || needles.length === 0) return true;
  const lower = haystack.toLowerCase();
  return needles.some((needle) => lower.includes(needle.toLowerCase()));
}

function filterMatchesByAlertCriteria(matches: MatchRow[], criteria?: JobAlert['criteria']): MatchRow[] {
  if (!criteria) return matches;

  return matches.filter((job) => {
    const text = `${job.position_title} ${job.company_name}`;

    if (!includesAny(text, criteria.keywords)) return false;
    if (!includesAny(job.region || '', criteria.regions)) return false;
    if (!includesAny(job.industry || '', criteria.industries)) return false;

    return true;
  });
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const lockCutoff = new Date(Date.now() - LOCK_DURATION_MINUTES * 60 * 1000).toISOString();
  const { data: recentRun } = await supabase
    .from('workflow_logs')
    .select('id, started_at')
    .eq('workflow_name', 'match-notify')
    .eq('status', 'completed')
    .gte('started_at', lockCutoff)
    .limit(1);

  if (recentRun && recentRun.length > 0) {
    return new Response(
      JSON.stringify({
        success: true,
        skipped: true,
        reason: 'Already ran within lock period',
        last_run: recentRun[0].started_at,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const results = {
    alerts_checked: 0,
    users_matched: 0,
    notifications_sent: 0,
    notifications_recorded: 0,
    sms_attempted: 0,
    sms_delivered: 0,
    sms_failed: 0,
    opportunities_seen_recently: 0,
    errors: [] as string[],
  };

  try {
    const sixHoursAgo = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000).toISOString();

    const [placementsRes, listingsRes] = await Promise.all([
      supabase
        .from('placements')
        .select('id')
        .gte('created_at', sixHoursAgo)
        .eq('approved', true)
        .limit(100),
      supabase
        .from('listings')
        .select('id')
        .gte('created_at', sixHoursAgo)
        .limit(100),
    ]);

    if (placementsRes.error) throw placementsRes.error;
    if (listingsRes.error) throw listingsRes.error;

    results.opportunities_seen_recently = (placementsRes.data?.length || 0) + (listingsRes.data?.length || 0);
    if (results.opportunities_seen_recently === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No recent opportunities to match' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: alerts, error: alertsError } = await supabase
      .from('job_alerts')
      .select('*')
      .eq('active', true);

    if (alertsError) throw alertsError;
    if (!alerts || alerts.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No active alerts' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    results.alerts_checked = alerts.length;

    for (const alert of alerts as JobAlert[]) {
      if (alert.last_notified_at) {
        const lastNotified = new Date(alert.last_notified_at);
        const hoursSince = (Date.now() - lastNotified.getTime()) / (1000 * 60 * 60);
        if (hoursSince < 4) continue;
      }

      let rankedMatches: MatchRow[] = [];

      const { data: matchedByEmbedding, error: embeddingError } = await supabase.rpc('match_jobs_by_embedding', {
        p_user_id: alert.user_id,
        p_limit: 20,
      });

      if (!embeddingError && matchedByEmbedding) {
        rankedMatches = (matchedByEmbedding as Array<Record<string, unknown>>).map((row) => ({
          placement_id: String(row.placement_id),
          position_title: String(row.position_title || ''),
          company_name: String(row.company_name || ''),
          region: row.region ? String(row.region) : null,
          industry: row.industry ? String(row.industry) : null,
          match_score: Number(row.similarity ?? row.match_score ?? 0),
          match_reasons: Array.isArray(row.match_reasons) ? (row.match_reasons as string[]) : ['Embedding similarity'],
          source_table: row.source_table ? String(row.source_table) : 'placements',
        }));
      } else {
        const { data: matchedByProfile, error: matchError } = await supabase.rpc('match_profile_to_jobs', {
          p_user_id: alert.user_id,
          p_limit: 20,
        });

        if (matchError) {
          const composedError = embeddingError
            ? `match_jobs_by_embedding(${alert.user_id}): ${embeddingError.message}; match_profile_to_jobs(${alert.user_id}): ${matchError.message}`
            : `match_profile_to_jobs(${alert.user_id}): ${matchError.message}`;
          results.errors.push(composedError);
          continue;
        }

        rankedMatches = (matchedByProfile || []) as MatchRow[];
      }
      const filteredMatches = filterMatchesByAlertCriteria(rankedMatches, alert.criteria);
      const matchingJobs = filteredMatches.slice(0, 5);

      if (matchingJobs.length === 0) continue;

      results.users_matched++;

      const topMatch = matchingJobs[0];
      const message = `🎯 ${matchingJobs.length} new match${matchingJobs.length > 1 ? 'es' : ''} for you: ${topMatch.position_title} at ${topMatch.company_name}`;

      for (const channel of alert.channels || []) {
        try {
          if (channel === 'push') {
            const { data: pushSubs, error: pushError } = await supabase
              .from('push_subscriptions')
              .select('id')
              .eq('user_id', alert.user_id)
              .limit(1);

            if (pushError) {
              results.errors.push(`push_subscriptions(${alert.user_id}): ${pushError.message}`);
              continue;
            }

            if (!pushSubs || pushSubs.length === 0) continue;
          }

          if (channel === 'sms') {
            results.sms_attempted++;
            const smsResult = await sendSmsNotification({
              supabase,
              userId: alert.user_id,
              message,
              matches: matchingJobs,
            });

            const { data: smsNotification, error: notifError } = await supabase.from('notifications').insert({
              user_id: alert.user_id,
              type: 'job_match',
              title: 'New Job Matches!',
              body: message,
              message,
              channel: ['sms', 'in_app'],
              sms_status: smsResult.delivered ? 'sent' : 'failed',
              sms_provider: smsResult.provider,
              sms_provider_message_id: smsResult.providerMessageId || null,
              sms_error: smsResult.reason || null,
              metadata: {
                sms_delivered: smsResult.delivered,
                sms_reason: smsResult.reason || null,
                sms_provider: smsResult.provider,
                sms_provider_message_id: smsResult.providerMessageId || null,
                matches: matchingJobs.map((j) => ({
                  id: j.placement_id,
                  title: j.position_title,
                  company_name: j.company_name,
                  match_score: j.match_score,
                  source_table: j.source_table || 'placements',
                })),
              },
              sent_at: new Date().toISOString(),
            }).select('id').single();

            if (notifError) {
              results.errors.push(`notifications(${alert.user_id}/sms): ${notifError.message}`);
            } else {
              results.notifications_recorded++;
              if (smsResult.delivered) {
                results.sms_delivered++;
              } else {
                results.sms_failed++;
              }

              await supabase.from('notification_events').insert({
                notification_id: smsNotification?.id,
                user_id: alert.user_id,
                event_type: smsResult.delivered ? 'sms_sent' : 'sms_failed',
              });
            }

            if (!smsResult.delivered && smsResult.reason) {
              results.errors.push(`sms(${alert.user_id}): ${smsResult.reason}`);
            }
            continue;
          }

          const { error: notifError } = await supabase.from('notifications').insert({
            user_id: alert.user_id,
            type: 'job_match',
            title: 'New Job Matches!',
            body: message,
            message,
            channel: [channel, 'in_app'],
            metadata: {
              matches: matchingJobs.map((j) => ({
                id: j.placement_id,
                title: j.position_title,
                company_name: j.company_name,
                match_score: j.match_score,
                source_table: j.source_table || 'placements',
              })),
            },
            sent_at: new Date().toISOString(),
          });

          if (notifError) {
            results.errors.push(`notifications(${alert.user_id}/${channel}): ${notifError.message}`);
          } else {
            results.notifications_sent++;
            results.notifications_recorded++;
          }
        } catch (err) {
          results.errors.push(`${channel}: ${(err as Error).message}`);
        }
      }

      await supabase
        .from('job_alerts')
        .update({ last_notified_at: new Date().toISOString() })
        .eq('id', alert.id);
    }

    await supabase.from('workflow_logs').insert({
      workflow_name: 'match-notify',
      status: results.errors.length ? 'warning' : 'completed',
      completed_at: new Date().toISOString(),
      items_processed: results.alerts_checked,
      items_succeeded: results.notifications_sent,
      metadata: results,
    });

    return new Response(
      JSON.stringify({ success: true, ...results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    await supabase.from('workflow_logs').insert({
      workflow_name: 'match-notify',
      status: 'failed',
      completed_at: new Date().toISOString(),
      error_message: (error as Error).message,
    });

    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
