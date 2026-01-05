import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (_req) => {
  return new Response(JSON.stringify({
    error: 'This Edge Function has been disabled. AI responsibilities were removed from the app; use your n8n workflow or external service to generate embeddings.'
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 410 })
})
