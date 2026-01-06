import { corsHeaders } from './auth.ts';

interface Payload {
  [key: string]: unknown;
}

export function jsonSuccess(data: Payload = {}, status = 200, headers: HeadersInit = {}) {
  return new Response(
    JSON.stringify({ success: true, ok: true, ...data }),
    { status, headers: { 'Content-Type': 'application/json', ...corsHeaders, ...headers } },
  );
}

export function jsonError(message: string, status = 400, extras: Payload = {}, headers: HeadersInit = {}) {
  return new Response(
    JSON.stringify({ success: false, ok: false, error: message, ...extras }),
    { status, headers: { 'Content-Type': 'application/json', ...corsHeaders, ...headers } },
  );
}
