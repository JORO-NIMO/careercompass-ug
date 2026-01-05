import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (_req) => {
  return new Response(JSON.stringify({
    error: 'This function has been disabled. Profile analysis AI was removed; use external services (n8n) to analyze profiles.'
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 410 })
})
