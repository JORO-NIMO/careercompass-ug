// Supabase Edge Function - hCaptcha verification
// Verifies hCaptcha tokens server-side with rate limiting

import { jsonError, jsonSuccess } from '../_shared/responses.ts';
import { handleCors } from '../_shared/auth.ts';
import {
    checkRateLimit,
    getClientIdentifier,
    rateLimitExceededResponse,
    rateLimitHeaders,
    RATE_LIMITS,
} from '../_shared/rateLimit.ts';

const HCAPTCHA_SECRET = Deno.env.get('HCAPTCHA_SECRET') || '';
const HCAPTCHA_VERIFY_URL = 'https://hcaptcha.com/siteverify';

interface VerifyRequest {
    token: string;
}

interface HCaptchaResponse {
    success: boolean;
    challenge_ts?: string;
    hostname?: string;
    'error-codes'?: string[];
}

const handler = async (req: Request): Promise<Response> => {
    // Handle CORS preflight
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    // Only allow POST
    if (req.method !== 'POST') {
        return jsonError('Method not allowed', 405);
    }

    // Apply rate limiting
    const clientId = getClientIdentifier(req);
    const rateLimit = checkRateLimit(clientId, RATE_LIMITS.captcha);

    if (!rateLimit.allowed) {
        return rateLimitExceededResponse(rateLimit.resetAt);
    }

    try {
        // Check if secret is configured
        if (!HCAPTCHA_SECRET) {
            console.error('HCAPTCHA_SECRET not configured');
            return jsonError('CAPTCHA verification not configured', 500);
        }

        // Parse request body
        const body = await req.json().catch(() => ({})) as Partial<VerifyRequest>;
        const { token } = body;

        if (!token || typeof token !== 'string') {
            return jsonError('Missing or invalid hCaptcha token', 400, {
                ...rateLimitHeaders(rateLimit.remaining, rateLimit.resetAt),
            });
        }

        // Verify with hCaptcha API
        const verifyResponse = await fetch(HCAPTCHA_VERIFY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                response: token,
                secret: HCAPTCHA_SECRET,
            }),
        });

        if (!verifyResponse.ok) {
            console.error('hCaptcha API error:', verifyResponse.status);
            return jsonError('CAPTCHA verification service unavailable', 503, {
                ...rateLimitHeaders(rateLimit.remaining, rateLimit.resetAt),
            });
        }

        const result = await verifyResponse.json() as HCaptchaResponse;

        if (result.success) {
            return jsonSuccess(
                {
                    success: true,
                    timestamp: result.challenge_ts,
                    hostname: result.hostname,
                },
                200,
                rateLimitHeaders(rateLimit.remaining, rateLimit.resetAt)
            );
        } else {
            console.warn('hCaptcha verification failed:', result['error-codes']);
            return jsonError(
                'CAPTCHA verification failed',
                403,
                {
                    errors: result['error-codes'],
                    ...rateLimitHeaders(rateLimit.remaining, rateLimit.resetAt),
                }
            );
        }
    } catch (err) {
        console.error('verify-hcaptcha error:', err);
        return jsonError('Internal server error', 500, {
            ...rateLimitHeaders(rateLimit.remaining, rateLimit.resetAt),
        });
    }
};

Deno.serve(handler);
