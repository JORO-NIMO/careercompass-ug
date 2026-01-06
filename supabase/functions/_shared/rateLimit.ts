/**
 * Rate limiting utility for Supabase Edge Functions
 * Uses sliding window algorithm with in-memory storage
 */

interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  limit: number;
  /** Window size in seconds */
  windowSecs: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (per edge function instance)
const store = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
const CLEANUP_INTERVAL_MS = 60000; // 1 minute
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  
  lastCleanup = now;
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier (e.g., IP address, user ID)
 * @param config - Rate limit configuration
 * @returns Object with allowed status and rate limit headers
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = { limit: 60, windowSecs: 60 }
): { allowed: boolean; remaining: number; resetAt: number } {
  cleanup();
  
  const now = Date.now();
  const windowMs = config.windowSecs * 1000;
  const key = identifier;
  
  let entry = store.get(key);
  
  // If no entry or window expired, create new entry
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 1,
      resetAt: now + windowMs,
    };
    store.set(key, entry);
    return {
      allowed: true,
      remaining: config.limit - 1,
      resetAt: entry.resetAt,
    };
  }
  
  // Increment count
  entry.count++;
  
  // Check if over limit
  if (entry.count > config.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }
  
  return {
    allowed: true,
    remaining: config.limit - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Get client identifier from request (IP address or user ID)
 */
export function getClientIdentifier(req: Request, userId?: string): string {
  if (userId) return `user:${userId}`;
  
  // Try to get IP from headers (set by proxy/CDN)
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return `ip:${forwardedFor.split(',')[0].trim()}`;
  }
  
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return `ip:${realIp}`;
  }
  
  // Fallback to a generic identifier (less accurate but still useful)
  const userAgent = req.headers.get('user-agent') || 'unknown';
  return `ua:${userAgent.substring(0, 50)}`;
}

/**
 * Create rate limit response headers
 */
export function rateLimitHeaders(remaining: number, resetAt: number): Record<string, string> {
  return {
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
  };
}

/**
 * Create a 429 Too Many Requests response
 */
export function rateLimitExceededResponse(resetAt: number): Response {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
  return new Response(
    JSON.stringify({
      error: 'Too many requests',
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
        ...rateLimitHeaders(0, resetAt),
      },
    }
  );
}

// Default configurations for different endpoint types
export const RATE_LIMITS = {
  // Auth endpoints - stricter limits
  auth: { limit: 10, windowSecs: 60 },
  // CAPTCHA verification - very strict
  captcha: { limit: 5, windowSecs: 60 },
  // Public API endpoints
  public: { limit: 60, windowSecs: 60 },
  // Authenticated API endpoints
  authenticated: { limit: 120, windowSecs: 60 },
  // Admin endpoints
  admin: { limit: 300, windowSecs: 60 },
} as const;
