import { createClient } from 'npm:@supabase/supabase-js@2';

import { jsonError } from './responses.ts';

const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') || 'null';
const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, prefer',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Vary': 'Origin',
};

export interface AuthResult {
  user: { id: string; email?: string } | null;
  error: string | null;
}

/**
 * Verify JWT token from Authorization header and return user info
 */
export async function verifyAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization');

  if (!authHeader) {
    return { user: null, error: 'Missing Authorization header' };
  }

  const token = authHeader.replace('Bearer ', '');

  if (!token) {
    return { user: null, error: 'Invalid token format' };
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || Deno.env.get('VITE_SUPABASE_URL');
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY');

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { user: null, error: 'Server configuration error' };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return { user: null, error: error?.message || 'Invalid or expired token' };
  }

  return { user: { id: user.id, email: user.email }, error: null };
}

/**
 * Create an unauthorized response with CORS headers
 */
export function unauthorizedResponse(message: string = 'Unauthorized'): Response {
  return jsonError(message, 401);
}

/**
 * Handle CORS preflight request
 */
export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.get('Origin') || '';
    const allow = allowedOrigin && origin === allowedOrigin ? origin : corsHeaders['Access-Control-Allow-Origin'];
    return new Response(null, {
      status: 204,
      headers: { ...corsHeaders, 'Access-Control-Allow-Origin': allow }
    });
  }
  return null;
}

export { corsHeaders };
