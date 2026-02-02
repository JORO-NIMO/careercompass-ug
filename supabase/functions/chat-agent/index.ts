// Deno Edge Function: chat-agent
// Handles LLM orchestration with tool calling for the career assistant

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatRequest {
  sessionId?: string;
  message: string;
  context?: {
    userId?: string;
    currentPage?: string;
  };
}

interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

// Tool definitions for the LLM
const tools = [
  {
    type: 'function',
    function: {
      name: 'searchPlacements',
      description: 'Search for job placements, internships, and opportunities',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          region: { type: 'string', description: 'Filter by region/location' },
          industry: { type: 'string', description: 'Filter by industry' },
          limit: { type: 'number', description: 'Max results (default: 5)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'matchProfile',
      description: "Get personalized job recommendations based on user's profile",
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Max recommendations' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'subscribeAlerts',
      description: 'Subscribe user to job alerts',
      parameters: {
        type: 'object',
        properties: {
          criteria: {
            type: 'object',
            properties: {
              regions: { type: 'array', items: { type: 'string' } },
              industries: { type: 'array', items: { type: 'string' } },
              keywords: { type: 'array', items: { type: 'string' } },
            },
          },
          channels: {
            type: 'array',
            items: { type: 'string', enum: ['push', 'email', 'sms'] },
          },
        },
        required: ['criteria', 'channels'],
      },
    },
  },
];

// Execute tool calls
async function executeTool(
  supabase: ReturnType<typeof createClient>,
  userId: string | null,
  toolCall: ToolCall,
): Promise<unknown> {
  const { name, arguments: args } = toolCall;

  switch (name) {
    case 'searchPlacements': {
      const { data, error } = await supabase.rpc('search_placements', {
        p_query: (args.query as string) || '',
        p_region: (args.region as string) || null,
        p_industry: (args.industry as string) || null,
        p_flagged: false,
        p_limit: (args.limit as number) || 5,
        p_offset: 0,
      });
      if (error) throw error;
      return data;
    }

    case 'matchProfile': {
      if (!userId) {
        return { error: 'User must be signed in for personalized recommendations' };
      }
      const { data, error } = await supabase.rpc('match_profile_to_jobs', {
        p_user_id: userId,
        p_limit: (args.limit as number) || 5,
      });
      if (error) throw error;
      return data;
    }

    case 'subscribeAlerts': {
      if (!userId) {
        return { error: 'User must be signed in to subscribe to alerts' };
      }
      const { data, error } = await supabase.rpc('subscribe_job_alerts', {
        p_user_id: userId,
        p_criteria: args.criteria,
        p_channels: args.channels,
      });
      if (error) throw error;
      return { subscriptionId: data, success: true };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// Format placements for LLM response
function formatPlacements(placements: Record<string, unknown>[]): string {
  if (!placements || placements.length === 0) {
    return 'No placements found.';
  }

  return placements
    .map((p, i) => {
      const matchInfo = p.match_score
        ? ` (${Math.round((p.match_score as number) * 100)}% match)`
        : '';
      return `${i + 1}. ${p.position_title} at ${p.company_name}${matchInfo} - ${p.region}, ${p.industry}`;
    })
    .join('\n');
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, context } = (await req.json()) as ChatRequest;

    // Get user from auth header
    const authHeader = req.headers.get('authorization');
    let userId: string | null = null;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Multi-provider support: Groq (free) -> OpenAI (paid) -> Gemini (free)
    const groqKey = Deno.env.get('GROQ_API_KEY');
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    const geminiKey = Deno.env.get('GOOGLE_API_KEY');
    
    // Select provider (priority: Groq > OpenAI > Gemini)
    type Provider = { name: string; url: string; key: string; model: string };
    let provider: Provider | null = null;
    const modelOverride = Deno.env.get('MODEL_OVERRIDE');
    const enableCodex = (Deno.env.get('ENABLE_GPT_5_2_CODEX') || '').toLowerCase() === 'true';
    
    if (enableCodex && openaiKey) {
      provider = {
        name: 'openai',
        url: 'https://api.openai.com/v1/chat/completions',
        key: openaiKey,
        model: modelOverride || 'gpt-5.2-codex',
      };
    } else if (groqKey) {
      provider = {
        name: 'groq',
        url: 'https://api.groq.com/openai/v1/chat/completions',
        key: groqKey,
        model: 'llama-3.3-70b-versatile', // Fast and capable
      };
    } else if (openaiKey) {
      provider = {
        name: 'openai',
        url: 'https://api.openai.com/v1/chat/completions',
        key: openaiKey,
        model: modelOverride || 'gpt-4o-mini',
      };
    } else if (geminiKey) {
      provider = {
        name: 'gemini',
        url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        key: geminiKey,
        model: 'gemini-1.5-flash',
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    // Server-side enforcement: restrict assistant on admin routes for non-admin users
    const currentPage = context?.currentPage || '';
    const isAdminPage = currentPage.startsWith('admin') || currentPage.startsWith('/admin');
    if (isAdminPage) {
      // Check admin role
      let isAdmin = false;
      if (userId) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .eq('role', 'admin')
          .maybeSingle();
        isAdmin = Boolean(roleData);
      }
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: 'Assistant not available on admin routes for non-admin users.' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // If no LLM provider configured, use simple pattern matching
    if (!provider) {
      // Simple intent detection fallback
      const lowerMessage = message.toLowerCase();
      let response = '';
      let toolResults: unknown[] = [];

      if (lowerMessage.includes('recommend') || lowerMessage.includes('for me') || lowerMessage.includes('match')) {
        const result = await executeTool(supabase, userId, {
          id: '1',
          name: 'matchProfile',
          arguments: { limit: 5 },
        });
        toolResults.push(result);
        response = Array.isArray(result)
          ? `Here are some opportunities that match your profile:\n\n${formatPlacements(result)}`
          : 'Please sign in to get personalized recommendations.';
      } else if (lowerMessage.includes('alert') || lowerMessage.includes('notify')) {
        const result = await executeTool(supabase, userId, {
          id: '2',
          name: 'subscribeAlerts',
          arguments: {
            criteria: {},
            channels: ['push', 'email'],
          },
        });
        toolResults.push(result);
        response = (result as { success?: boolean }).success
          ? "You're now subscribed to job alerts!"
          : 'Please sign in to set up job alerts.';
      } else {
        // Default: search
        const result = await executeTool(supabase, userId, {
          id: '3',
          name: 'searchPlacements',
          arguments: { query: message, limit: 5 },
        });
        toolResults.push(result);
        response = Array.isArray(result) && result.length > 0
          ? `I found ${result.length} opportunities:\n\n${formatPlacements(result)}`
          : 'No placements found. Try different keywords.';
      }

      return new Response(
        JSON.stringify({
          message: {
            role: 'assistant',
            content: response,
          },
          toolResults,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Full LLM orchestration with selected provider
    console.log(`Using LLM provider: ${provider.name} (${provider.model})`);
    
    const systemPrompt = `You are a helpful career assistant for CareerCompass, a platform connecting students and professionals with job placements, internships, and opportunities in Africa.

Your capabilities:
- Search for job placements by keywords, location, or industry
- Provide personalized recommendations based on user profiles
- Help users set up job alerts
- Answer career-related questions

Be concise, friendly, and helpful. When showing job results, format them clearly.
${userId ? 'The user is signed in and can access personalized features.' : 'The user is not signed in. Encourage them to sign in for personalized features.'}`;

    // Helper to make LLM calls (works with Groq/OpenAI compatible APIs)
    const callLLM = async (
      messages: Array<{role: string; content: string; tool_call_id?: string}>,
      useTools = true,
    ): Promise<{ message: any; usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number; elapsed_ms?: number } }> => {
      const start = Date.now();
      // Gemini uses a different API format
      if (provider!.name === 'gemini') {
        const geminiMessages = messages.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }));
        
        const response = await fetch(provider!.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: geminiMessages,
            generationConfig: { maxOutputTokens: 1000 }
          }),
        });
        
        const data = await response.json();
        if (data.error) throw new Error(`Gemini error: ${data.error.message}`);
        
        const elapsed_ms = Date.now() - start;
        return {
          message: {
            content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
            tool_calls: null,
          },
          usage: { elapsed_ms },
        };
      }
      
      // OpenAI/Groq compatible API
      const response = await fetch(provider!.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${provider!.key}`,
        },
        body: JSON.stringify({
          model: provider!.model,
          messages,
          ...(useTools ? { tools, tool_choice: 'auto' } : {}),
          max_tokens: 1000,
        }),
      });

      const data = await response.json();
      
      if (data.error) {
        console.error(`${provider!.name} API error:`, JSON.stringify(data.error));
        throw new Error(`${provider!.name} error: ${data.error.message || 'Unknown error'}`);
      }
      
      const msg = data.choices?.[0]?.message;
      if (!msg) {
        console.error(`Unexpected ${provider!.name} response:`, JSON.stringify(data));
        throw new Error(`No response from ${provider!.name}`);
      }
      const elapsed_ms = Date.now() - start;
      const usage = data.usage || undefined;
      return { message: msg, usage: usage ? { ...usage, elapsed_ms } : { elapsed_ms } };
    };

    // First LLM call
    const firstCall = await callLLM([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message },
    ]);
    const assistantMessage = firstCall.message;

    // Check for tool calls
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      const toolResults = [];

      for (const toolCall of assistantMessage.tool_calls) {
        const result = await executeTool(supabase, userId, {
          id: toolCall.id,
          name: toolCall.function.name,
          arguments: JSON.parse(toolCall.function.arguments),
        });
        toolResults.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          content: JSON.stringify(result),
        });
      }

      // Second LLM call with tool results
      const secondCall = await callLLM([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
        { role: 'assistant', content: '', ...assistantMessage },
        ...toolResults.map(r => ({ role: 'tool' as const, content: r.content, tool_call_id: r.tool_call_id })),
      ], false);
      const finalMessage = secondCall.message;
      const prompt_tokens = ((firstCall.usage?.prompt_tokens || 0) + (secondCall.usage?.prompt_tokens || 0)) || undefined;
      const completion_tokens = ((firstCall.usage?.completion_tokens || 0) + (secondCall.usage?.completion_tokens || 0)) || undefined;
      const total_tokens = ((firstCall.usage?.total_tokens || 0) + (secondCall.usage?.total_tokens || 0)) || undefined;
      const elapsed_ms = ((firstCall.usage?.elapsed_ms || 0) + (secondCall.usage?.elapsed_ms || 0)) || undefined;
      return new Response(
        JSON.stringify({
          message: {
            role: 'assistant',
            content: finalMessage?.content || 'I found some results for you.',
            toolCalls: assistantMessage.tool_calls,
          },
          toolResults: toolResults.map((r) => JSON.parse(r.content)),
          usage: { provider: provider!.name, model: provider!.model, promptTokens: prompt_tokens, completionTokens: completion_tokens, totalTokens: total_tokens, elapsedMs: elapsed_ms },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // No tool calls, return direct response
    return new Response(
      JSON.stringify({
        message: {
          role: 'assistant',
          content: assistantMessage.message.content,
        },
        usage: { provider: provider!.name, model: provider!.model, promptTokens: firstCall.usage?.prompt_tokens, completionTokens: firstCall.usage?.completion_tokens, totalTokens: firstCall.usage?.total_tokens, elapsedMs: firstCall.usage?.elapsed_ms },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Chat agent error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
