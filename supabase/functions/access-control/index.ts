// Supabase Edge Function - access-control
// Determines if the requesting IP is blocked
import { createSupabaseServiceClient } from '../_shared/sbClient.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function termsLink(): string {
  const base = Deno.env.get('PUBLIC_BASE_URL') || '';
  return `${base}/terms`;
}

const handler = async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const forwarded = req.headers.get('x-forwarded-for') || '';
  const ip = forwarded.split(',')[0].trim();

  if (!ip) {
    return new Response(JSON.stringify({ allowed: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from('user_ip_addresses')
      .select('flagged, flagged_reason')
      .eq('ip', ip)
      .order('last_seen', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (data?.flagged) {
      const message = 'Unable to access site. Refer to Terms and Conditions or contact admin@placementbridge.org';
      return new Response(JSON.stringify({ allowed: false, message, terms: termsLink() }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ allowed: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ allowed: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
};

Deno.serve(handler);