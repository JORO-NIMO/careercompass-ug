// Deno Edge Function: match-notify
// Matches users to jobs and sends notifications

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Lock duration in minutes - prevents duplicate runs
const LOCK_DURATION_MINUTES = 20;

interface JobAlert {
  id: string;
  user_id: string;
  criteria: {
    keywords?: string[];
    regions?: string[];
    industries?: string[];
  };
  channels: string[];
  last_notified_at: string | null;
}

interface Profile {
  id: string;
  phone_number?: string;
  push_subscription?: object;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Check for recent successful run (deduplication lock)
  const lockCutoff = new Date(Date.now() - LOCK_DURATION_MINUTES * 60 * 1000).toISOString();
  const { data: recentRun } = await supabase
    .from('workflow_logs')
    .select('id, started_at')
    .eq('workflow_name', 'match-notify')
    .eq('status', 'completed')
    .gte('started_at', lockCutoff)
    .limit(1);

  if (recentRun && recentRun.length > 0) {
    console.log('Skipping - already ran recently at', recentRun[0].started_at);
    return new Response(
      JSON.stringify({ 
        success: true, 
        skipped: true, 
        reason: 'Already ran within lock period',
        last_run: recentRun[0].started_at 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const results = {
    alerts_checked: 0,
    users_matched: 0,
    notifications_sent: 0,
    errors: [] as string[],
  };

  try {
    // Get new jobs from last 6 hours
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    
    const { data: newJobs, error: jobsError } = await supabase
      .from('placements')
      .select('id, position_title, company_name, region, industry')
      .gte('created_at', sixHoursAgo)
      .eq('approved', true)
      .limit(50);

    if (jobsError) throw jobsError;
    if (!newJobs || newJobs.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No new jobs to match' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${newJobs.length} new jobs`);

    // Get active job alerts
    const { data: alerts, error: alertsError } = await supabase
      .from('job_alerts')
      .select('*')
      .eq('active', true);

    if (alertsError) throw alertsError;
    if (!alerts || alerts.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No active alerts' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    results.alerts_checked = alerts.length;

    // Process each alert
    for (const alert of alerts as JobAlert[]) {
      // Rate limit: skip if notified in last 4 hours
      if (alert.last_notified_at) {
        const lastNotified = new Date(alert.last_notified_at);
        const hoursSince = (Date.now() - lastNotified.getTime()) / (1000 * 60 * 60);
        if (hoursSince < 4) continue;
      }

      // Find matching jobs
      const matchingJobs = newJobs.filter(job => {
        const criteria = alert.criteria || {};
        
        // Keyword match
        if (criteria.keywords?.length) {
          const jobText = `${job.position_title} ${job.company_name}`.toLowerCase();
          const hasKeyword = criteria.keywords.some((kw: string) => 
            jobText.includes(kw.toLowerCase())
          );
          if (!hasKeyword) return false;
        }
        
        // Region match
        if (criteria.regions?.length) {
          const hasRegion = criteria.regions.some((r: string) => 
            job.region?.toLowerCase().includes(r.toLowerCase())
          );
          if (!hasRegion) return false;
        }
        
        // Industry match
        if (criteria.industries?.length) {
          if (!criteria.industries.includes(job.industry)) return false;
        }
        
        return true;
      });

      if (matchingJobs.length === 0) continue;
      
      results.users_matched++;

      // Get user profile for contact info
      const { data: profile } = await supabase
        .from('profiles')
        .select('phone_number, push_subscription')
        .eq('id', alert.user_id)
        .single() as { data: Profile | null };

      // Send notifications based on channels
      const topMatch = matchingJobs[0];
      const message = `🎯 ${matchingJobs.length} new job${matchingJobs.length > 1 ? 's' : ''} for you! ${topMatch.position_title} at ${topMatch.company_name}`;

      for (const channel of alert.channels) {
        try {
          if (channel === 'push' && profile?.push_subscription) {
            // Send push notification
            await supabase.from('notifications').insert({
              user_id: alert.user_id,
              title: 'New Job Matches!',
              body: message,
              type: 'job_match',
              data: { job_ids: matchingJobs.map(j => j.id) },
            });
            results.notifications_sent++;
          }
          
          if (channel === 'sms' && profile?.phone_number) {
            // Send SMS via Africa's Talking
            const atKey = Deno.env.get('AFRICAS_TALKING_API_KEY');
            const atUser = Deno.env.get('AFRICAS_TALKING_USERNAME');
            
            if (atKey && atUser) {
              const smsResponse = await fetch('https://api.africastalking.com/version1/messaging', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                  'apiKey': atKey,
                  'Accept': 'application/json',
                },
                body: new URLSearchParams({
                  username: atUser,
                  to: profile.phone_number,
                  message: message.substring(0, 160),
                }),
              });
              
              if (smsResponse.ok) {
                results.notifications_sent++;
              }
            }
          }
        } catch (err) {
          results.errors.push(`${channel}: ${(err as Error).message}`);
        }
      }

      // Update last_notified_at
      await supabase
        .from('job_alerts')
        .update({ last_notified_at: new Date().toISOString() })
        .eq('id', alert.id);
    }

    // Log to workflow_logs
    await supabase.from('workflow_logs').insert({
      workflow_name: 'match-notify',
      status: 'completed',
      completed_at: new Date().toISOString(),
      items_processed: results.alerts_checked,
      items_succeeded: results.notifications_sent,
      metadata: results,
    });

    return new Response(
      JSON.stringify({ success: true, ...results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Match-notify error:', error);
    
    await supabase.from('workflow_logs').insert({
      workflow_name: 'match-notify',
      status: 'failed',
      completed_at: new Date().toISOString(),
      error_message: (error as Error).message,
    });

    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
