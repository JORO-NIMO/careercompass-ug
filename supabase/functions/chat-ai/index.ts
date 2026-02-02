import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatRequest {
    message: string;
    conversationHistory?: { role: string; content: string }[];
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const openaiKey = Deno.env.get('OPENAI_API_KEY')!;

        const supabase = createClient(supabaseUrl, supabaseKey);
        const { message, conversationHistory = [] }: ChatRequest = await req.json();

        // Fetch recent listings for context
        const { data: listings } = await supabase
            .from('listings')
            .select('id, title, description, created_at')
            .order('created_at', { ascending: false })
            .limit(30);

        // Build context from listings with a bit more detail
        const listingsContext = listings?.map(l =>
            `- ${l.title}: ${l.description?.slice(0, 500)}... (Ref: ${l.id})`
        ).join('\n') || 'No listings available.';

        const systemPrompt = `You are a helpful and knowledgeable career advisor for CareerCompass Uganda. 
  Your goal is to guide Ugandan students and fresh graduates toward meaningful career opportunities (internships, graduate trainee programs, and entry-level jobs).

  Available Opportunities (from our verified database):
  ${listingsContext}

  Guidelines:
  1. Be warm, encouraging, and culturally relevant to Uganda.
  2. Prioritize recommending opportunities from the list above. Mention them by title.
  3. If a user asks for specific details (deadline, skills, salary), check the snippets above. If it's not there, honestly state that they should check the full listing for those details.
  4. If you don't find a direct match, offer general career advice relevant to their field in the Ugandan context (mentioning relevant industry trends in Kampala/East Africa).
  5. Keep responses structured and easy to read.
  6. Encourage them to use our CV Builder and Learning Hub features.`;

        // Call OpenAI
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openaiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...conversationHistory.slice(-10),
                    { role: 'user', content: message },
                ],
                max_tokens: 500,
                temperature: 0.7,
            }),
        });

        const data = await response.json();
        const aiResponse = data.choices?.[0]?.message?.content || 'Sorry, I could not process your request.';

        return new Response(JSON.stringify({ response: aiResponse }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Chat AI error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
