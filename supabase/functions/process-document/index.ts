import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (_req) => {
  return new Response(JSON.stringify({
    error: 'This function has been disabled. Document processing AI was removed; use external ingestion workflows (n8n) to process documents.'
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 410 })
})
