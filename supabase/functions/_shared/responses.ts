import { corsHeaders } from './auth.ts';
import { rateLimitHeaders } from './rateLimit.ts';

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

/** Merge arbitrary headers in a type-friendly way (assumes object usage). */
export function withHeaders(headers: HeadersInit = {}, extra: HeadersInit = {}): HeadersInit {
  return { ...(headers as Record<string, string>), ...(extra as Record<string, string>) };
}

/** Convenience to attach X-RateLimit-* to an existing headers bag. */
export function withRateLimitHeaders(headers: HeadersInit = {}, remaining: number, resetAt: number): HeadersInit {
  return withHeaders(headers, rateLimitHeaders(remaining, resetAt));
}

/** Append `X-Request-Id` header. */
export function withRequestIdHeaders(headers: HeadersInit = {}, requestId: string): HeadersInit {
  return withHeaders(headers, { 'X-Request-Id': requestId });
}

/** Error response including request id in headers and body. */
export function jsonErrorWithId(
  message: string,
  status = 400,
  extras: Payload = {},
  headers: HeadersInit = {},
  requestId?: string,
) {
  const bodyExtras = requestId ? { request_id: requestId, ...extras } : extras;
  const hdrs = requestId ? withRequestIdHeaders(headers, requestId) : headers;
  return jsonError(message, status, bodyExtras, hdrs);
}

/** RFC7807-style problem+json response. */
export function problemJson(
  type: string,
  title: string,
  status: number,
  detail?: string,
  extras: Payload = {},
  headers: HeadersInit = {},
  requestId?: string,
) {
  const body = { type, title, status, detail, ...extras };
  return jsonErrorWithId(title, status, body, headers, requestId);
}

/** Method not allowed helper including Allow header. */
export function methodNotAllowed(allowed: string[], headers: HeadersInit = {}, requestId?: string) {
  const hdrs = withHeaders(headers, { 'Allow': allowed.join(', ') });
  return jsonErrorWithId('Method not allowed', 405, { allowed }, hdrs, requestId);
}
